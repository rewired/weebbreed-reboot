#!/usr/bin/env python3
"""Interactive CLI monitor for the WeedBreed simulation via Server-Sent Events."""

from __future__ import annotations

import argparse
import json
import select
import sys
import termios
import threading
import time
import tty
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Sequence

import requests


@dataclass
class SimulationKpiState:
    """Mutable container for simulation KPIs we care about."""

    paused: Optional[bool] = None
    running: Optional[bool] = None
    speed: Optional[float] = None
    tick: Optional[int] = None
    cash_on_hand: Optional[float] = None

    def update_from_time_status(self, status: Dict[str, Any]) -> bool:
        if not isinstance(status, dict):
            return False
        changed = False
        paused = status.get("paused")
        if isinstance(paused, bool) and paused is not self.paused:
            self.paused = paused
            changed = True
        running = status.get("running")
        if isinstance(running, bool) and running is not self.running:
            self.running = running
            changed = True
        speed = status.get("speed")
        if isinstance(speed, (int, float)) and not isinstance(speed, bool):
            speed_value = float(speed)
            if speed_value != self.speed:
                self.speed = speed_value
                changed = True
        tick = status.get("tick")
        if isinstance(tick, int) and tick != self.tick:
            self.tick = tick
            changed = True
        return changed

    def update_from_snapshot(self, snapshot: Dict[str, Any]) -> bool:
        if not isinstance(snapshot, dict):
            return False
        changed = False
        tick = snapshot.get("tick")
        if isinstance(tick, int) and tick != self.tick:
            self.tick = tick
            changed = True
        finance = snapshot.get("finance")
        if isinstance(finance, dict):
            cash = finance.get("cashOnHand")
            if isinstance(cash, (int, float)) and not isinstance(cash, bool):
                cash_value = float(cash)
                if cash_value != self.cash_on_hand:
                    self.cash_on_hand = cash_value
                    changed = True
        return changed

    def update_from_update_entry(self, entry: Dict[str, Any]) -> bool:
        if not isinstance(entry, dict):
            return False
        changed = False
        time_status = entry.get("time")
        if isinstance(time_status, dict):
            changed |= self.update_from_time_status(time_status)
        snapshot = entry.get("snapshot")
        if isinstance(snapshot, dict):
            changed |= self.update_from_snapshot(snapshot)
        tick = entry.get("tick")
        if isinstance(tick, int) and tick != self.tick:
            self.tick = tick
            changed = True
        return changed

    def status_label(self) -> str:
        if self.paused is True:
            return "pause"
        if self.paused is False:
            return "play"
        return "unknown"

    def format_line(self) -> str:
        status = self.status_label()
        tick = str(self.tick) if self.tick is not None else "?"
        speed = f"{self.speed:.2f}x" if self.speed is not None else "?"
        cash = f"{self.cash_on_hand:,.2f}" if self.cash_on_hand is not None else "?"
        return f"Status: {status} | Tick: {tick} | Speed: {speed} | Cash: {cash}"


def parse_sse_stream(lines: Iterable[str]) -> Iterable[tuple[str, str]]:
    """Yield (event, data) tuples from raw SSE lines."""

    event_name: Optional[str] = None
    data_lines: List[str] = []

    for raw_line in lines:
        if raw_line is None:
            continue
        line = raw_line.rstrip("\n")
        if not line:
            if event_name and data_lines:
                yield event_name, "\n".join(data_lines)
            event_name = None
            data_lines = []
            continue
        if line.startswith(":"):
            continue
        if line.startswith("event:"):
            event_name = line.split(":", 1)[1].strip()
            continue
        if line.startswith("data:"):
            data_lines.append(line.split(":", 1)[1].lstrip())
            continue
    # Ignore other fields (id:, retry:, etc.) for now.


@dataclass
class StructureRow:
    """Normalized representation of a structure entry."""

    identifier: str
    name: str
    status: Optional[str]
    room_count: Optional[int]
    area: Optional[float]

    def display_label(self) -> str:
        parts: List[str] = [self.name]
        if self.status:
            parts.append(f"status: {self.status}")
        if isinstance(self.room_count, int):
            parts.append(f"rooms: {self.room_count}")
        if isinstance(self.area, (int, float)) and not isinstance(self.area, bool):
            parts.append(f"area: {self.area:.0f} m²")
        return " | ".join(parts)


def _parse_structure(payload: Dict[str, Any]) -> Optional[StructureRow]:
    identifier = payload.get("id")
    name = payload.get("name")
    if not isinstance(identifier, str) or not isinstance(name, str):
        return None
    status_value = payload.get("status")
    status = status_value if isinstance(status_value, str) else None
    rooms = payload.get("roomIds")
    room_count = len(rooms) if isinstance(rooms, list) else None
    footprint = payload.get("footprint")
    area: Optional[float] = None
    if isinstance(footprint, dict):
        footprint_area = footprint.get("area")
        if isinstance(footprint_area, (int, float)) and not isinstance(footprint_area, bool):
            area = float(footprint_area)
    return StructureRow(identifier=identifier, name=name, status=status, room_count=room_count, area=area)


@dataclass
class StructureListState:
    """Tracks available structures and the current selection."""

    entries: List[StructureRow] = field(default_factory=list)
    selected_index: int = 0

    def update_from_snapshot(self, snapshot: Dict[str, Any]) -> bool:
        structures = snapshot.get("structures") if isinstance(snapshot, dict) else None
        if not isinstance(structures, list):
            changed = bool(self.entries)
            self.entries = []
            self.selected_index = 0
            return changed

        previous_selected_id = None
        if self.entries and 0 <= self.selected_index < len(self.entries):
            previous_selected_id = self.entries[self.selected_index].identifier

        new_entries: List[StructureRow] = []
        for item in structures:
            if isinstance(item, dict):
                parsed = _parse_structure(item)
                if parsed:
                    new_entries.append(parsed)

        if new_entries == self.entries:
            return False

        self.entries = new_entries
        if not self.entries:
            self.selected_index = 0
            return True

        if previous_selected_id:
            for idx, entry in enumerate(self.entries):
                if entry.identifier == previous_selected_id:
                    self.selected_index = idx
                    break
            else:
                self.selected_index = min(self.selected_index, len(self.entries) - 1)
        else:
            self.selected_index = min(self.selected_index, len(self.entries) - 1)

        return True

    def move_selection(self, delta: int) -> bool:
        if not self.entries:
            self.selected_index = 0
            return False
        new_index = (self.selected_index + delta) % len(self.entries)
        if new_index == self.selected_index:
            return False
        self.selected_index = new_index
        return True

    def selected(self) -> Optional[StructureRow]:
        if not self.entries:
            return None
        if not (0 <= self.selected_index < len(self.entries)):
            return None
        return self.entries[self.selected_index]

    def render_lines(self) -> List[str]:
        lines = [f"Structures ({len(self.entries)}):"]
        if not self.entries:
            lines.append("  (no structures available)")
            return lines
        for idx, entry in enumerate(self.entries):
            label = entry.display_label()
            if idx == self.selected_index:
                lines.append(f"> \x1b[7m{label}\x1b[0m")
            else:
                lines.append(f"  {label}")
        return lines


class ConsoleRenderer:
    """Handles terminal rendering for the monitor."""

    def __init__(self) -> None:
        self._cursor_hidden = False

    def _ensure_cursor_hidden(self) -> None:
        if not self._cursor_hidden and sys.stdout.isatty():
            sys.stdout.write("\x1b[?25l")
            sys.stdout.flush()
            self._cursor_hidden = True

    def restore_cursor(self) -> None:
        if self._cursor_hidden and sys.stdout.isatty():
            sys.stdout.write("\x1b[?25h")
            sys.stdout.flush()
            self._cursor_hidden = False

    def render(
        self,
        kpi_line: str,
        structure_lines: Sequence[str],
        message: Optional[str],
    ) -> None:
        self._ensure_cursor_hidden()
        lines = [kpi_line]
        if message:
            lines.append(message)
        lines.extend(structure_lines)
        output = "\n".join(lines)
        sys.stdout.write("\x1b[2J\x1b[H" + output + "\n")
        sys.stdout.flush()


class MonitorState:
    """Co-ordinates SSE updates, rendering, and user input."""

    def __init__(self) -> None:
        self.kpis = SimulationKpiState()
        self.structures = StructureListState()
        self.renderer = ConsoleRenderer()
        self.message: Optional[str] = None
        self._lock = threading.Lock()
        self._render_event = threading.Event()
        self._stop_event = threading.Event()

    def stop(self) -> None:
        self._stop_event.set()

    def stopped(self) -> bool:
        return self._stop_event.is_set()

    def set_message(self, message: Optional[str]) -> None:
        with self._lock:
            self.message = message
        self.request_render()

    def request_render(self) -> None:
        self._render_event.set()

    def wait_for_render(self, timeout: float = 0.1) -> bool:
        return self._render_event.wait(timeout)

    def render(self) -> None:
        with self._lock:
            message = self.message
            kpi_line = self.kpis.format_line()
            structure_lines = self.structures.render_lines()
        self.renderer.render(kpi_line, structure_lines, message)
        self._render_event.clear()

    def handle_event(self, name: str, raw_payload: str) -> None:
        try:
            payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            return

        changed = False
        if name == "time.status":
            status = payload.get("status") if isinstance(payload, dict) else None
            if isinstance(status, dict):
                changed |= self.kpis.update_from_time_status(status)
        elif name == "simulationUpdate":
            updates = payload.get("updates") if isinstance(payload, dict) else None
            if isinstance(updates, list):
                for update in updates:
                    if isinstance(update, dict):
                        if self.kpis.update_from_update_entry(update):
                            changed = True
                        snapshot = update.get("snapshot")
                        if isinstance(snapshot, dict):
                            if self.structures.update_from_snapshot(snapshot):
                                changed = True
        if changed:
            self.request_render()


def _read_additional_input(timeout: float) -> Optional[str]:
    ready, _, _ = select.select([sys.stdin], [], [], timeout)
    if not ready:
        return None
    return sys.stdin.read(1)


def _handle_keypress(state: MonitorState) -> bool:
    if not sys.stdin.isatty():
        time.sleep(0.05)
        return False
    ready, _, _ = select.select([sys.stdin], [], [], 0.05)
    if not ready:
        return False
    char = sys.stdin.read(1)
    if char == "\x03":
        raise KeyboardInterrupt
    if char != "\x1b":
        return False
    second = _read_additional_input(0.01)
    if second != "[":
        return False
    third = _read_additional_input(0.01)
    if third == "A":
        changed = state.structures.move_selection(-1)
    elif third == "B":
        changed = state.structures.move_selection(1)
    else:
        changed = False
    if changed:
        state.request_render()
    return changed


def _stream_loop(url: str, state: MonitorState) -> None:
    while not state.stopped():
        try:
            with requests.get(url, stream=True, timeout=30) as response:
                response.raise_for_status()
                state.set_message("Verbunden – warte auf Events…")
                for event_name, raw_data in parse_sse_stream(
                    response.iter_lines(decode_unicode=True)
                ):
                    if state.stopped():
                        return
                    state.handle_event(event_name, raw_data)
        except requests.RequestException as error:
            if state.stopped():
                return
            state.set_message(f"Verbindungsfehler: {error}. Neuer Versuch in 5s…")
            for _ in range(50):
                if state.stopped():
                    return
                time.sleep(0.1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Monitor WeedBreed simulation KPIs via SSE.")
    parser.add_argument(
        "--url",
        default="http://localhost:7331/events",
        help="SSE endpoint to connect to (default: %(default)s)",
    )
    args = parser.parse_args()

    if not sys.stdin.isatty() or not sys.stdout.isatty():
        print("Interactive monitoring requires a TTY.")
        sys.exit(1)

    monitor_state = MonitorState()
    monitor_state.set_message(f"Verbinde mit {args.url} …")
    stream_thread = threading.Thread(target=_stream_loop, args=(args.url, monitor_state), daemon=True)
    stream_thread.start()

    fd = sys.stdin.fileno()
    previous_settings = termios.tcgetattr(fd)
    tty.setcbreak(fd)
    try:
        while not monitor_state.stopped():
            try:
                if monitor_state.wait_for_render(timeout=0.05):
                    monitor_state.render()
                _handle_keypress(monitor_state)
            except KeyboardInterrupt:
                monitor_state.stop()
    finally:
        monitor_state.stop()
        stream_thread.join(timeout=1.0)
        termios.tcsetattr(fd, termios.TCSADRAIN, previous_settings)
        monitor_state.renderer.restore_cursor()
        print("\nMonitoring stopped.")


if __name__ == "__main__":
    main()

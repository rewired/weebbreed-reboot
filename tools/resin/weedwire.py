#!/usr/bin/env python3
"""Interactive CLI monitor for the WeedBreed simulation via Server-Sent Events.

Also known as RESIN (Real-time Event Stream INspector) and "weedwire".
"""

from __future__ import annotations

import argparse
import json
import os
import select
import sys
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Generic, Iterable, List, Optional, Protocol, Sequence, TypeVar

import colorama
import requests

IS_POSIX = os.name == "posix"
IS_WINDOWS = os.name == "nt"

if IS_POSIX:
    import termios
    import tty
else:  # pragma: no cover - imported conditionally for typing friendliness
    termios = None  # type: ignore[assignment]
    tty = None  # type: ignore[assignment]

if IS_WINDOWS:
    import ctypes  # type: ignore
    from ctypes import wintypes
    import msvcrt  # type: ignore
else:  # pragma: no cover - imported conditionally for typing friendliness
    ctypes = None  # type: ignore[assignment]
    wintypes = None  # type: ignore[assignment]
    msvcrt = None  # type: ignore[assignment]


class TerminalController:
    """Abstracts platform-specific terminal control helpers."""

    def enter_raw_mode(self) -> None:  # pragma: no cover - interface method
        """Put stdin into raw/unbuffered mode when supported."""

    def restore_mode(self) -> None:  # pragma: no cover - interface method
        """Restore the terminal to its original settings."""

    def poll_key(self, timeout: float) -> Optional[str]:  # pragma: no cover - interface method
        """Poll for a single character within ``timeout`` seconds."""

    def read_key(self, timeout: float) -> Optional[str]:  # pragma: no cover - interface method
        """Read the next character, waiting up to ``timeout`` seconds."""


class PosixTerminalController(TerminalController):
    """Terminal controller implementation for POSIX platforms."""

    def __init__(self) -> None:
        self._previous_settings: Optional[Sequence[int]] = None
        self._fd = sys.stdin.fileno()

    def enter_raw_mode(self) -> None:
        if not sys.stdin.isatty() or termios is None or tty is None:
            return
        self._previous_settings = termios.tcgetattr(self._fd)
        tty.setcbreak(self._fd)

    def restore_mode(self) -> None:
        if self._previous_settings is None or termios is None:
            return
        termios.tcsetattr(self._fd, termios.TCSADRAIN, self._previous_settings)
        self._previous_settings = None

    def poll_key(self, timeout: float) -> Optional[str]:
        if not sys.stdin.isatty():
            return None
        ready, _, _ = select.select([sys.stdin], [], [], timeout)
        if not ready:
            return None
        return sys.stdin.read(1)

    def read_key(self, timeout: float) -> Optional[str]:
        return self.poll_key(timeout)


class WindowsTerminalController(TerminalController):
    """Terminal controller implementation for Windows consoles."""

    ENABLE_ECHO_INPUT = 0x0004
    ENABLE_LINE_INPUT = 0x0002
    ENABLE_EXTENDED_FLAGS = 0x0080
    ENABLE_VIRTUAL_TERMINAL_INPUT = 0x0200

    def __init__(self) -> None:
        if msvcrt is None or ctypes is None or wintypes is None:
            raise OSError("msvcrt module is unavailable on this platform")

        self._msvcrt = msvcrt
        self._kernel32 = ctypes.windll.kernel32
        self._stdin_handle = self._kernel32.GetStdHandle(-10)  # STD_INPUT_HANDLE
        invalid_handle = ctypes.c_void_p(-1).value
        if self._stdin_handle in (0, invalid_handle):
            raise OSError("Failed to obtain Windows STDIN handle")
        mode = wintypes.DWORD()
        if not self._kernel32.GetConsoleMode(self._stdin_handle, ctypes.byref(mode)):
            raise OSError("Failed to read Windows console mode")
        self._original_mode = mode.value
        self._buffer: List[str] = []

    def enter_raw_mode(self) -> None:
        if not sys.stdin.isatty():
            return
        new_mode = self._original_mode
        new_mode &= ~(self.ENABLE_LINE_INPUT | self.ENABLE_ECHO_INPUT)
        new_mode |= self.ENABLE_EXTENDED_FLAGS | self.ENABLE_VIRTUAL_TERMINAL_INPUT
        self._kernel32.SetConsoleMode(self._stdin_handle, new_mode)

    def restore_mode(self) -> None:
        if self._original_mode is not None:
            self._kernel32.SetConsoleMode(self._stdin_handle, self._original_mode)

    def _dequeue(self) -> Optional[str]:
        if self._buffer:
            return self._buffer.pop(0)
        return None

    def _queue_sequence(self, sequence: Sequence[str]) -> None:
        self._buffer.extend(sequence)

    def _read_windows_key_sequence(self) -> None:
        char = self._msvcrt.getwch()
        if char in ("\x00", "\xe0"):
            if self._msvcrt.kbhit():
                code = self._msvcrt.getwch()
            else:
                code = self._msvcrt.getwch()
            mapping = {
                "H": ["\x1b", "[", "A"],
                "P": ["\x1b", "[", "B"],
                "K": ["\x1b", "[", "D"],
                "M": ["\x1b", "[", "C"],
            }
            sequence = mapping.get(code)
            if sequence:
                self._queue_sequence(sequence)
            return
        self._buffer.append(char)

    def poll_key(self, timeout: float) -> Optional[str]:
        if not sys.stdin.isatty():
            return None
        deadline = time.time() + max(timeout, 0.0)
        while True:
            buffered = self._dequeue()
            if buffered is not None:
                return buffered
            if self._msvcrt.kbhit():
                self._read_windows_key_sequence()
                continue
            remaining = deadline - time.time()
            if remaining <= 0:
                break
            time.sleep(min(0.01, remaining))
        return self._dequeue()

    def read_key(self, timeout: float) -> Optional[str]:
        return self.poll_key(timeout)


class NonInteractiveTerminalController(TerminalController):
    """Fallback controller when interactive features are unavailable."""

    def __init__(self, reason: str) -> None:
        self._reason = reason
        self._warned = False

    def enter_raw_mode(self) -> None:
        if not self._warned:
            sys.stderr.write(f"Warning: {self._reason}\n")
            sys.stderr.flush()
            self._warned = True

    def restore_mode(self) -> None:
        return

    def poll_key(self, timeout: float) -> Optional[str]:
        if timeout > 0:
            time.sleep(timeout)
        return None

    def read_key(self, timeout: float) -> Optional[str]:
        if timeout > 0:
            time.sleep(timeout)
        return None


def create_terminal_controller() -> TerminalController:
    """Instantiate the best available terminal controller for this platform."""

    if not sys.stdin.isatty() or not sys.stdout.isatty():
        return NonInteractiveTerminalController("interactive monitoring requires a TTY; running without keyboard controls")
    if IS_POSIX:
        return PosixTerminalController()
    if IS_WINDOWS:
        try:
            return WindowsTerminalController()
        except OSError as error:
            return NonInteractiveTerminalController(
                f"interactive terminal controls unavailable: {error}"
            )
    return NonInteractiveTerminalController(
        "unsupported platform for interactive terminal controls"
    )

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


class DisplayLabelProvider(Protocol):
    """Protocol for list rows that can be rendered within a pane."""

    def display_label(self) -> str:
        """Return the human readable label for the row."""


TSelectable = TypeVar("TSelectable", bound=DisplayLabelProvider)


@dataclass
class SelectableListState(Generic[TSelectable]):
    """Shared selection mechanics for monitor list panes."""

    entries: List[TSelectable] = field(default_factory=list)
    selected_index: int = 0

    def move_selection(self, delta: int) -> bool:
        if not self.entries:
            self.selected_index = 0
            return False
        new_index = (self.selected_index + delta) % len(self.entries)
        if new_index == self.selected_index:
            return False
        self.selected_index = new_index
        return True

    def selected(self) -> Optional[TSelectable]:
        if not self.entries:
            return None
        if not (0 <= self.selected_index < len(self.entries)):
            return None
        return self.entries[self.selected_index]

    def _rows_with_selection(self) -> tuple[List[str], Optional[int]]:
        if not self.entries:
            return ([], None)
        rows = [entry.display_label() for entry in self.entries]
        selected_index = (
            self.selected_index if 0 <= self.selected_index < len(rows) else None
        )
        return (rows, selected_index)

    def build_list_pane(
        self,
        *,
        focused: bool,
        title: str,
        empty_message: str,
        rows: Optional[Sequence[str]] = None,
        selected_index: Optional[int] = None,
    ) -> "ListPane":
        if rows is None:
            computed_rows, computed_selected = self._rows_with_selection()
        else:
            computed_rows = list(rows)
            computed_selected = selected_index
        if not computed_rows:
            computed_rows = [empty_message]
            computed_selected = None
        prefix = "▶" if focused else " "
        pane_title = f"{prefix} {title} ({len(self.entries)}):"
        return ListPane(
            title=pane_title,
            rows=computed_rows,
            selected_index=computed_selected,
            focused=focused,
        )


class StructureListState(SelectableListState[StructureRow]):
    """Tracks available structures and the current selection."""

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

    def build_pane(self, focused: bool) -> "ListPane":
        return self.build_list_pane(
            focused=focused,
            title="Structures",
            empty_message="(no structures available)",
        )


@dataclass
class ListPane:
    """Structured description of a list pane within the viewport."""

    title: str
    rows: Sequence[str]
    selected_index: Optional[int]
    focused: bool


class ConsoleRenderer:
    """Handles terminal rendering for the monitor."""

    WIDTH = 80
    HEIGHT = 30
    INNER_WIDTH = WIDTH - 2
    INNER_HEIGHT = HEIGHT - 2

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

    @staticmethod
    def _truncate_line(text: str, max_width: int) -> str:
        if max_width <= 0:
            return ""
        if len(text) <= max_width:
            return text
        if max_width == 1:
            return text[:1]
        return text[: max_width - 1] + "…"

    def _format_title(self, pane: ListPane) -> str:
        return self._truncate_line(pane.title, self.INNER_WIDTH)

    def _format_row(self, text: str, selected: bool) -> str:
        prefix = ">" if selected else " "
        body = f" {text}" if text else ""
        return self._truncate_line(f"{prefix}{body}", self.INNER_WIDTH)

    def _limit_rows(
        self, rows: Sequence[str], selected_index: Optional[int], max_slots: int
    ) -> List[tuple[str, bool]]:
        if max_slots <= 0:
            return []
        total = len(rows)
        if total == 0:
            return [("(no entries)", False)]
        if selected_index is None:
            selected_index = 0
        selected_index = max(0, min(selected_index, total - 1))
        if total <= max_slots:
            return [(rows[idx], idx == selected_index) for idx in range(total)]

        window = max_slots
        start = max(0, min(selected_index - window // 2, total - window))
        end = min(start + window, total)

        output: List[tuple[str, bool]] = []
        slots_remaining = max_slots
        if start > 0:
            output.append(("…", False))
            slots_remaining -= 1

        for idx in range(start, end):
            if slots_remaining <= 0:
                break
            output.append((rows[idx], idx == selected_index))
            slots_remaining -= 1

        if end < total:
            if slots_remaining <= 0:
                for i in range(len(output) - 1, -1, -1):
                    text, is_selected = output[i]
                    if not is_selected:
                        output[i] = ("…", False)
                        break
            else:
                output.append(("…", False))

        return output[:max_slots]

    def _compose_content(
        self,
        header_lines: Sequence[str],
        message_lines: Sequence[str],
        panes: Sequence[ListPane],
    ) -> List[str]:
        content: List[str] = []

        for line in header_lines:
            if len(content) >= self.INNER_HEIGHT:
                break
            content.append(self._truncate_line(line, self.INNER_WIDTH))

        for line in message_lines:
            if len(content) >= self.INNER_HEIGHT:
                break
            content.append(self._truncate_line(line, self.INNER_WIDTH))

        for pane_index, pane in enumerate(panes):
            if len(content) >= self.INNER_HEIGHT:
                break
            if content and (pane_index > 0 or message_lines):
                if len(content) >= self.INNER_HEIGHT:
                    break
                content.append("")
            if len(content) >= self.INNER_HEIGHT:
                break
            content.append(self._format_title(pane))
            remaining = self.INNER_HEIGHT - len(content)
            limited_rows = self._limit_rows(pane.rows, pane.selected_index, remaining)
            for text, is_selected in limited_rows:
                if len(content) >= self.INNER_HEIGHT:
                    break
                content.append(self._format_row(text, is_selected))

        return content

    def render(
        self,
        header_lines: Sequence[str],
        message_lines: Sequence[str],
        panes: Sequence[ListPane],
    ) -> None:
        self._ensure_cursor_hidden()

        buffer: List[List[str]] = [
            [" "] * self.WIDTH for _ in range(self.HEIGHT)
        ]

        # Draw border
        buffer[0][0] = "┌"
        buffer[0][-1] = "┐"
        buffer[-1][0] = "└"
        buffer[-1][-1] = "┘"
        for col in range(1, self.WIDTH - 1):
            buffer[0][col] = "─"
            buffer[-1][col] = "─"
        for row in range(1, self.HEIGHT - 1):
            buffer[row][0] = "│"
            buffer[row][-1] = "│"

        content_lines = self._compose_content(header_lines, message_lines, panes)

        for row_index, line in enumerate(content_lines[: self.INNER_HEIGHT]):
            padded = self._truncate_line(line, self.INNER_WIDTH).ljust(
                self.INNER_WIDTH, " "
            )
            target_row = row_index + 1
            for col_index, char in enumerate(padded):
                buffer[target_row][col_index + 1] = char

        output_lines = ["".join(row) for row in buffer]
        output = "\n".join(output_lines)
        sys.stdout.write("\x1b[2J\x1b[H" + output + "\n")
        sys.stdout.flush()


@dataclass
class RoomRow:
    """Normalized representation of a room entry."""

    identifier: str
    structure_identifier: str
    name: str
    purpose: Optional[str]
    zone_count: Optional[int]
    area: Optional[float]

    def display_label(self) -> str:
        parts: List[str] = [self.name]
        if self.purpose:
            parts.append(f"purpose: {self.purpose}")
        if isinstance(self.zone_count, int):
            parts.append(f"zones: {self.zone_count}")
        if isinstance(self.area, (int, float)) and not isinstance(self.area, bool):
            parts.append(f"area: {self.area:.0f} m²")
        return " | ".join(parts)


def _parse_room(payload: Dict[str, Any]) -> Optional["RoomRow"]:
    identifier = payload.get("id")
    name = payload.get("name")
    structure_identifier = payload.get("structureId")
    if (
        not isinstance(identifier, str)
        or not isinstance(name, str)
        or not isinstance(structure_identifier, str)
    ):
        return None
    purpose_value = payload.get("purposeName")
    purpose = purpose_value if isinstance(purpose_value, str) else None
    zone_ids = payload.get("zoneIds")
    zone_count = len(zone_ids) if isinstance(zone_ids, list) else None
    area_value = payload.get("area")
    area = None
    if isinstance(area_value, (int, float)) and not isinstance(area_value, bool):
        area = float(area_value)
    return RoomRow(
        identifier=identifier,
        structure_identifier=structure_identifier,
        name=name,
        purpose=purpose,
        zone_count=zone_count,
        area=area,
    )


@dataclass
class RoomListState(SelectableListState[RoomRow]):
    """Tracks rooms for the selected structure and the current selection."""

    _rooms_by_structure: Dict[str, List[RoomRow]] = field(default_factory=dict)
    _current_structure_id: Optional[str] = None

    def update_from_snapshot(
        self, snapshot: Dict[str, Any], structure_id: Optional[str]
    ) -> bool:
        rooms = snapshot.get("rooms") if isinstance(snapshot, dict) else None
        new_map: Dict[str, List[RoomRow]] = {}
        if isinstance(rooms, list):
            for item in rooms:
                if isinstance(item, dict):
                    parsed = _parse_room(item)
                    if parsed:
                        new_map.setdefault(parsed.structure_identifier, []).append(parsed)
        changed = new_map != self._rooms_by_structure
        if changed:
            self._rooms_by_structure = new_map
        structure_changed = self.select_structure(structure_id)
        return changed or structure_changed

    def select_structure(self, structure_id: Optional[str]) -> bool:
        if structure_id == self._current_structure_id and not self._rooms_changed():
            return False
        self._current_structure_id = structure_id
        return self._apply_current_structure()

    def _rooms_changed(self) -> bool:
        if self._current_structure_id is None:
            return bool(self.entries)
        expected = self._rooms_by_structure.get(self._current_structure_id, [])
        return expected != self.entries

    def _apply_current_structure(self) -> bool:
        if self._current_structure_id is None:
            changed = bool(self.entries)
            self.entries = []
            self.selected_index = 0
            return changed
        previous_selected_id = None
        if self.entries and 0 <= self.selected_index < len(self.entries):
            previous_selected_id = self.entries[self.selected_index].identifier
        new_entries = list(self._rooms_by_structure.get(self._current_structure_id, []))
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
                self.selected_index = 0
        else:
            self.selected_index = min(self.selected_index, len(self.entries) - 1)
        return True

    def build_pane(self, focused: bool) -> "ListPane":
        if self._current_structure_id is None:
            return self.build_list_pane(
                focused=focused,
                title="Rooms",
                empty_message="(no rooms available)",
                rows=["Select a structure to view rooms"],
                selected_index=None,
            )
        return self.build_list_pane(
            focused=focused,
            title="Rooms",
            empty_message="(no rooms available)",
        )


@dataclass
class ZoneRow(DisplayLabelProvider):
    """Normalized representation of a zone entry."""

    identifier: str
    room_identifier: str
    name: str
    area: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    vpd: Optional[float]

    def display_label(self) -> str:
        parts: List[str] = [self.name]
        metrics: List[str] = []
        if isinstance(self.temperature, (int, float)) and not isinstance(self.temperature, bool):
            metrics.append(f"T: {self.temperature:.1f}°C")
        if isinstance(self.humidity, (int, float)) and not isinstance(self.humidity, bool):
            metrics.append(f"RH: {self.humidity:.0%}")
        if isinstance(self.vpd, (int, float)) and not isinstance(self.vpd, bool):
            metrics.append(f"VPD: {self.vpd:.2f}")
        if metrics:
            parts.append(" | ".join(metrics))
        if isinstance(self.area, (int, float)) and not isinstance(self.area, bool):
            parts.append(f"area: {self.area:.0f} m²")
        return " | ".join(parts)


def _parse_zone(payload: Dict[str, Any]) -> Optional[ZoneRow]:
    identifier = payload.get("id")
    name = payload.get("name")
    room_identifier = payload.get("roomId")
    if (
        not isinstance(identifier, str)
        or not isinstance(name, str)
        or not isinstance(room_identifier, str)
    ):
        return None
    area_value = payload.get("area")
    area: Optional[float] = None
    if isinstance(area_value, (int, float)) and not isinstance(area_value, bool):
        area = float(area_value)
    environment = payload.get("environment")
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    vpd: Optional[float] = None
    if isinstance(environment, dict):
        temp_value = environment.get("temperature")
        if isinstance(temp_value, (int, float)) and not isinstance(temp_value, bool):
            temperature = float(temp_value)
        humidity_value = environment.get("relativeHumidity")
        if isinstance(humidity_value, (int, float)) and not isinstance(humidity_value, bool):
            humidity = float(humidity_value)
        vpd_value = environment.get("vpd")
        if isinstance(vpd_value, (int, float)) and not isinstance(vpd_value, bool):
            vpd = float(vpd_value)
    return ZoneRow(
        identifier=identifier,
        room_identifier=room_identifier,
        name=name,
        area=area,
        temperature=temperature,
        humidity=humidity,
        vpd=vpd,
    )


@dataclass
class ZoneListState(SelectableListState[ZoneRow]):
    """Tracks zones for the selected room and their selection."""

    _zones_by_room: Dict[str, List[ZoneRow]] = field(default_factory=dict)
    _current_room_id: Optional[str] = None
    _selected_per_room: Dict[str, int] = field(default_factory=dict)

    def update_from_snapshot(
        self, snapshot: Dict[str, Any], room_id: Optional[str]
    ) -> bool:
        zones = snapshot.get("zones") if isinstance(snapshot, dict) else None
        new_map: Dict[str, List[ZoneRow]] = {}
        if isinstance(zones, list):
            for item in zones:
                if isinstance(item, dict):
                    parsed = _parse_zone(item)
                    if parsed:
                        new_map.setdefault(parsed.room_identifier, []).append(parsed)
        changed = new_map != self._zones_by_room
        if changed:
            self._zones_by_room = new_map
        room_changed = self.select_room(room_id)
        return changed or room_changed

    def select_room(self, room_id: Optional[str]) -> bool:
        if room_id == self._current_room_id and not self._zones_changed():
            return False
        self._remember_selection()
        self._current_room_id = room_id
        return self._apply_current_room()

    def _zones_changed(self) -> bool:
        if self._current_room_id is None:
            return bool(self.entries)
        expected = self._zones_by_room.get(self._current_room_id, [])
        return expected != self.entries

    def _remember_selection(self) -> None:
        if self._current_room_id is None:
            return
        if self.entries and 0 <= self.selected_index < len(self.entries):
            self._selected_per_room[self._current_room_id] = self.selected_index

    def _apply_current_room(self) -> bool:
        if self._current_room_id is None:
            changed = bool(self.entries)
            self.entries = []
            self.selected_index = 0
            return changed
        previous_selected_id = None
        if self.entries and 0 <= self.selected_index < len(self.entries):
            previous_selected_id = self.entries[self.selected_index].identifier
        new_entries = list(self._zones_by_room.get(self._current_room_id, []))
        if new_entries == self.entries:
            return False
        self.entries = new_entries
        if not self.entries:
            self.selected_index = 0
            return True
        saved_index = self._selected_per_room.get(self._current_room_id)
        if saved_index is not None and 0 <= saved_index < len(self.entries):
            self.selected_index = saved_index
        elif previous_selected_id:
            for idx, entry in enumerate(self.entries):
                if entry.identifier == previous_selected_id:
                    self.selected_index = idx
                    break
            else:
                self.selected_index = 0
        else:
            self.selected_index = min(self.selected_index, len(self.entries) - 1)
        self._selected_per_room[self._current_room_id] = self.selected_index
        return True

    def move_selection(self, delta: int) -> bool:
        changed = super().move_selection(delta)
        if changed and self._current_room_id is not None and self.entries:
            self._selected_per_room[self._current_room_id] = self.selected_index
        return changed

    def build_pane(self, focused: bool) -> "ListPane":
        if self._current_room_id is None:
            return self.build_list_pane(
                focused=focused,
                title="Zones",
                empty_message="(no zones available)",
                rows=["Select a room to view zones"],
                selected_index=None,
            )
        return self.build_list_pane(
            focused=focused,
            title="Zones",
            empty_message="(no zones available)",
        )


class MonitorState:
    """Co-ordinates SSE updates, rendering, and user input."""

    def __init__(self) -> None:
        self.kpis = SimulationKpiState()
        self.structures = StructureListState()
        self.rooms = RoomListState()
        self.zones = ZoneListState()
        self.renderer = ConsoleRenderer()
        self.message: Optional[str] = None
        self._lock = threading.Lock()
        self._render_event = threading.Event()
        self._stop_event = threading.Event()
        self._focus: str = "structures"

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
            header_lines = [self.kpis.format_line()]
            message_lines = [message] if message else []
            panes = [
                self.structures.build_pane(focused=self._focus == "structures"),
                self.rooms.build_pane(focused=self._focus == "rooms"),
                self.zones.build_pane(focused=self._focus == "zones"),
            ]
        self.renderer.render(header_lines, message_lines, panes)
        self._render_event.clear()

    def selected_structure_id(self) -> Optional[str]:
        selected = self.structures.selected()
        return selected.identifier if selected else None

    def selected_room_id(self) -> Optional[str]:
        selected = self.rooms.selected()
        return selected.identifier if selected else None

    def selected_zone_id(self) -> Optional[str]:
        selected = self.zones.selected()
        return selected.identifier if selected else None

    def toggle_focus(self) -> bool:
        focus_order = ["structures", "rooms", "zones"]
        if self._focus not in focus_order:
            self._focus = "structures"
            return True
        current_index = focus_order.index(self._focus)
        for step in range(1, len(focus_order) + 1):
            next_focus = focus_order[(current_index + step) % len(focus_order)]
            if next_focus == "rooms" and not self.rooms.entries:
                continue
            if next_focus == "zones" and not self.zones.entries:
                continue
            if next_focus != self._focus:
                self._focus = next_focus
                return True
            break
        return False

    def focus_parent(self) -> bool:
        if self._focus == "zones":
            if self.rooms.entries:
                self._focus = "rooms"
            else:
                self._focus = "structures"
            return True
        if self._focus == "rooms":
            self._focus = "structures"
            return True
        return False

    def ensure_valid_focus(self) -> bool:
        if self._focus == "zones" and not self.zones.entries:
            if self.rooms.entries:
                self._focus = "rooms"
            else:
                self._focus = "structures"
            return True
        if self._focus == "rooms" and not self.rooms.entries:
            self._focus = "structures"
            return True
        if self._focus not in ("structures", "rooms", "zones"):
            self._focus = "structures"
            return True
        return False

    def move_selection(self, delta: int) -> bool:
        if self._focus == "zones":
            return self.zones.move_selection(delta)
        if self._focus == "rooms":
            changed = self.rooms.move_selection(delta)
            if self.zones.select_room(self.selected_room_id()):
                changed = True
            return changed
        changed = self.structures.move_selection(delta)
        if self.rooms.select_structure(self.selected_structure_id()):
            changed = True
        if self.zones.select_room(self.selected_room_id()):
            changed = True
        return changed

    def ensure_room_sync(self) -> bool:
        changed = self.rooms.select_structure(self.selected_structure_id())
        if self.zones.select_room(self.selected_room_id()):
            changed = True
        return changed

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
                            structure_changed = self.structures.update_from_snapshot(
                                snapshot
                            )
                            if structure_changed:
                                changed = True
                            rooms_changed = self.rooms.update_from_snapshot(
                                snapshot, self.selected_structure_id()
                            )
                            if rooms_changed:
                                changed = True
                            zones_changed = self.zones.update_from_snapshot(
                                snapshot, self.selected_room_id()
                            )
                            if zones_changed:
                                changed = True
                            if self._focus == "rooms" and not self.rooms.entries:
                                if self.focus_parent():
                                    changed = True
                            if self._focus == "zones" and not self.zones.entries:
                                if self.focus_parent():
                                    changed = True
        else:
            return
        if self.ensure_room_sync():
            changed = True
        if self.ensure_valid_focus():
            changed = True
        if changed:
            self.request_render()


def _read_additional_input(controller: TerminalController, timeout: float) -> Optional[str]:
    return controller.read_key(timeout)


def _handle_keypress(state: MonitorState, controller: TerminalController) -> bool:
    char = controller.poll_key(0.05)
    if char is None:
        return False
    if char == "\x03":
        raise KeyboardInterrupt
    if char in ("\r", "\n"):
        changed = state.toggle_focus()
        if changed:
            state.request_render()
        return changed
    if char in ("\x7f", "\b"):
        changed = state.focus_parent()
        if changed:
            state.request_render()
        return changed
    if char != "\x1b":
        return False
    second = _read_additional_input(controller, 0.01)
    if second is None:
        changed = state.focus_parent()
        if changed:
            state.request_render()
        return changed
    if second != "[":
        return False
    third = _read_additional_input(controller, 0.01)
    if third == "A":
        changed = state.move_selection(-1)
    elif third == "B":
        changed = state.move_selection(1)
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

    colorama.init()

    monitor_state = MonitorState()
    monitor_state.set_message(f"Verbinde mit {args.url} …")
    stream_thread = threading.Thread(target=_stream_loop, args=(args.url, monitor_state), daemon=True)
    stream_thread.start()

    terminal = create_terminal_controller()
    terminal.enter_raw_mode()
    try:
        while not monitor_state.stopped():
            try:
                if monitor_state.wait_for_render(timeout=0.05):
                    monitor_state.render()
                _handle_keypress(monitor_state, terminal)
            except KeyboardInterrupt:
                monitor_state.stop()
    finally:
        monitor_state.stop()
        stream_thread.join(timeout=1.0)
        terminal.restore_mode()
        monitor_state.renderer.restore_cursor()
        print("\nMonitoring stopped.")


if __name__ == "__main__":
    main()

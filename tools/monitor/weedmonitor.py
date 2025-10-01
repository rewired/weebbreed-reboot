#!/usr/bin/env python3
"""Simple CLI monitor for the WeedBreed simulation via Server-Sent Events."""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional

import requests


@dataclass
class SimulationKpiState:
    """Mutable container for simulation KPIs we care about."""

    paused: Optional[bool] = None
    running: Optional[bool] = None
    speed: Optional[float] = None
    tick: Optional[int] = None
    cash_on_hand: Optional[float] = None

    def update_from_time_status(self, status: Dict[str, Any]) -> None:
        if not isinstance(status, dict):
            return
        paused = status.get("paused")
        if isinstance(paused, bool):
            self.paused = paused
        running = status.get("running")
        if isinstance(running, bool):
            self.running = running
        speed = status.get("speed")
        if isinstance(speed, (int, float)) and not isinstance(speed, bool):
            self.speed = float(speed)
        tick = status.get("tick")
        if isinstance(tick, int):
            self.tick = tick

    def update_from_snapshot(self, snapshot: Dict[str, Any]) -> None:
        if not isinstance(snapshot, dict):
            return
        tick = snapshot.get("tick")
        if isinstance(tick, int):
            self.tick = tick
        finance = snapshot.get("finance")
        if isinstance(finance, dict):
            cash = finance.get("cashOnHand")
            if isinstance(cash, (int, float)) and not isinstance(cash, bool):
                self.cash_on_hand = float(cash)

    def update_from_update_entry(self, entry: Dict[str, Any]) -> None:
        if not isinstance(entry, dict):
            return
        time_status = entry.get("time")
        if isinstance(time_status, dict):
            self.update_from_time_status(time_status)
        snapshot = entry.get("snapshot")
        if isinstance(snapshot, dict):
            self.update_from_snapshot(snapshot)
        tick = entry.get("tick")
        if isinstance(tick, int):
            self.tick = tick

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


@dataclass
class KpiRenderer:
    """Renders KPI lines, keeping the console tidy."""

    _last_length: int = field(default=0, init=False)

    def render(self, line: str) -> None:
        padding = max(0, self._last_length - len(line))
        sys.stdout.write("\r" + line + (" " * padding))
        sys.stdout.flush()
        self._last_length = len(line)

    def clear(self) -> None:
        if self._last_length:
            sys.stdout.write("\r" + (" " * self._last_length) + "\r")
            sys.stdout.flush()
            self._last_length = 0


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


def handle_event(name: str, raw_payload: str, state: SimulationKpiState, renderer: KpiRenderer) -> None:
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError:
        return

    if name == "time.status":
        status = payload.get("status") if isinstance(payload, dict) else None
        if isinstance(status, dict):
            state.update_from_time_status(status)
    elif name == "simulationUpdate":
        updates = payload.get("updates") if isinstance(payload, dict) else None
        if isinstance(updates, list):
            for update in updates:
                if isinstance(update, dict):
                    state.update_from_update_entry(update)
    # Other events are currently ignored for KPI purposes.

    renderer.render(state.format_line())


def stream_events(url: str) -> None:
    state = SimulationKpiState()
    renderer = KpiRenderer()

    while True:
        try:
            with requests.get(url, stream=True, timeout=30) as response:
                response.raise_for_status()
                renderer.render("Waiting for events…")
                for event_name, raw_data in parse_sse_stream(
                    response.iter_lines(decode_unicode=True)
                ):
                    handle_event(event_name, raw_data, state, renderer)
        except KeyboardInterrupt:
            renderer.clear()
            print("Monitoring stopped by user.")
            return
        except requests.RequestException as error:
            renderer.render(f"Connection error: {error}. Reconnecting in 5s…")
            time.sleep(5)


def main() -> None:
    parser = argparse.ArgumentParser(description="Monitor WeedBreed simulation KPIs via SSE.")
    parser.add_argument(
        "--url",
        default="http://localhost:7331/events",
        help="SSE endpoint to connect to (default: %(default)s)",
    )
    args = parser.parse_args()

    stream_events(args.url)


if __name__ == "__main__":
    main()

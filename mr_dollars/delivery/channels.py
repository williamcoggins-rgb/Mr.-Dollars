"""
Mr. Dollars — Delivery Channels

Output channels for delivering intelligence reports.
Supports console, WebSocket (for the live UI), and extensible hooks.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from mr_dollars.engine.models import DollarsReport

logger = logging.getLogger("mr_dollars.delivery")


class ConsoleChannel:
    """Print report to console/stdout."""

    def deliver(self, report: DollarsReport) -> None:
        print(report.text_summary)


class WebSocketChannel:
    """
    Deliver report via WebSocket to the Mr. Dollars UI.
    The animated dollar avatar reacts to report content in real time.
    """

    def __init__(self):
        self._connections: list = []

    def register(self, websocket: Any) -> None:
        self._connections.append(websocket)

    def unregister(self, websocket: Any) -> None:
        if websocket in self._connections:
            self._connections.remove(websocket)

    async def deliver(self, report: DollarsReport) -> int:
        """
        Broadcast report to all connected UI clients.
        Returns count of successful deliveries.
        """
        payload = json.dumps(report.json_payload)
        sent = 0
        dead: list = []

        for ws in self._connections:
            try:
                await ws.send_text(payload)
                sent += 1
            except Exception as e:
                logger.warning("WebSocket send failed: %s", e)
                dead.append(ws)

        for ws in dead:
            self.unregister(ws)

        return sent

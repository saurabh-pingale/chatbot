import json
from typing import Dict, List, Any
from fastapi import WebSocket, WebSocketDisconnect

from app.utils.logger import logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, shop_id: str) -> None:
        """Connect a client to the websocket."""
        await websocket.accept()
        if shop_id not in self.active_connections:
            self.active_connections[shop_id] = []
        self.active_connections[shop_id].append(websocket)
        logger.info(f"WebSocket connection established for shop: {shop_id}")

    def disconnect(self, websocket: WebSocket, shop_id: str) -> None:
        """Remove a client from the active connections."""
        if shop_id in self.active_connections:
            if websocket in self.active_connections[shop_id]:
                self.active_connections[shop_id].remove(websocket)
            if not self.active_connections[shop_id]:
                del self.active_connections[shop_id]
        logger.info(f"WebSocket connection closed for shop: {shop_id}")

    async def send_message(self, shop_id: str, message: Dict[str, Any]) -> None:
        """Send a message to all connected clients for a specific shop."""
        if shop_id in self.active_connections:
            for connection in self.active_connections[shop_id]:
                await connection.send_text(json.dumps(message))

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Send a message to all connected clients."""
        for shop_id in self.active_connections:
            for connection in self.active_connections[shop_id]:
                await connection.send_text(json.dumps(message))
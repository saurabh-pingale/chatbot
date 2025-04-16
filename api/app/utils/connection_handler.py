import json
from typing import Dict, List, Any
from fastapi import WebSocket
from asyncio import Lock

from app.utils.logger import logger

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.lock = Lock()

    async def connect(self, websocket: WebSocket, shop_id: str) -> None:
        """Connect a client to the websocket."""
        async with self.lock:
            logger.info(f"Attempting to accept connection for shop_id: {shop_id}")
            await websocket.accept()
            if shop_id not in self.active_connections:
                self.active_connections[shop_id] = []
            self.active_connections[shop_id].append(websocket)
        logger.info(f"WebSocket connection established for shop: {shop_id}")

    async def disconnect(self, websocket: WebSocket, shop_id: str) -> None:
        """Remove a client from the active connections."""
        async with self.lock:
            if shop_id in self.active_connections:
                if websocket in self.active_connections[shop_id]:
                    self.active_connections[shop_id].remove(websocket)
                if not self.active_connections[shop_id]:
                    del self.active_connections[shop_id]
        logger.info(f"WebSocket connection closed for shop: {shop_id}")

    async def send_message(self, shop_id: str, message: Dict[str, Any]) -> None:
        """Send a message to all connected clients for a specific shop."""
        if shop_id in self.active_connections:
            for connection in self.active_connections[shop_id][:]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to connection: {str(e)}")
                    async with self.lock:
                        self.active_connections[shop_id].remove(connection)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """Send a message to all connected clients."""
        for shop_id in self.active_connections:
            for connection in self.active_connections[shop_id]:
                await connection.send_text(json.dumps(message))
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.utils.app_utils import get_app
from app.utils.connection_handler import ConnectionManager
from app.utils.logger import logger

manager = ConnectionManager()

ws_router = APIRouter(tags=["websocket"])

@ws_router.websocket("/ws/conversation/{shop_id}/{user_id}")
async def websocket_conversation(websocket: WebSocket, shop_id: str, user_id: str):
    """WebSocket endpoint for conversation storage."""
    await manager.connect(websocket, shop_id)
    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "store_conversation":
                app = get_app()
                conversation_data = {
                    "user_query": data.get("user_query", ""),
                    "agent_response": data.get("agent_response", ""),
                    "user_id": user_id,
                    "store_id": shop_id
                }
                
                try:
                    conversation_id = await app.conversation_service.store_conversation(conversation_data)
                    await websocket.send_json({
                        "type": "conversation_stored",
                        "success": True,
                        "conversation_id": conversation_id
                    })
                    logger.info(f"Conversation stored with ID: {conversation_id}")
                except Exception as e:
                    logger.error(f"Error storing conversation: {str(e)}")
                    await websocket.send_json({
                        "type": "conversation_stored",
                        "success": False,
                        "error": str(e)
                    })
    except WebSocketDisconnect:
        await manager.disconnect(websocket, shop_id)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await manager.disconnect(websocket, shop_id)
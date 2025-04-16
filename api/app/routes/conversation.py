from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, HTTPException, Depends
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.models.api.conversation import ConversationListResponse, ErrorResponse
from app.utils.connection_handler import ConnectionManager
from app.utils.logger import logger

manager = ConnectionManager()

conversation_router = APIRouter(prefix="/conversation_router", tags=["conversation_router"])
ws_router = APIRouter(tags=["websocket"])

@ws_router.websocket("/ws/conversation/{shop_id}/{user_id}")
async def websocket_conversation(websocket: WebSocket, shop_id: str, user_id: str):
    """WebSocket endpoint for conversation storage."""
    logger.info(f"WebSocket connection attempt for shop_id: {shop_id}, user_id: {user_id}")
    await manager.connect(websocket, shop_id)
    try:
        while True:
            data = await websocket.receive_json()

            #TODO - Why are you checking for store_conversation, we can create multiple sockets for different purposes
            if data.get("type") == "store_conversation":
                app = get_app()
                conversation_data = {
                    "user_query": data.get("user_query", ""),
                    "agent_response": data.get("agent_response", ""),
                    "user_id": int(user_id),
                    "store_id": int(shop_id)
                }
                
                #TODO - If socket is not store_conversation and conversation_data is null, where are you handling that failure part
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
        manager.disconnect(websocket, shop_id)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket, shop_id)

@conversation_router.get(
    "/{user_id}/{store_id}",
    response_model=ConversationListResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_conversations(user_id: int, store_id: int, request: Request):
    """Get conversations for a specific user and store."""
    try:
        app = get_app()
        conversations = await app.conversation_service.get_user_conversations(user_id, store_id)
        return {"conversations": conversations}
    except Exception as error:
        logger.error(f"Error in get_conversations: {str(error)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")
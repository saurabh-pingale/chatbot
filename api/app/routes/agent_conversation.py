from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import ValidationError
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse, AgentConversationPayload
from app.models.api.shop_admin import AuthPayloadModel
from app.constants import MESSAGE_LIMIT, AGENT_CONVERSATION_RATE_LIMIT, PREVIOUS_MESSAGE_CONTEXT_LIMIT, EXCLUDE_LAST_MESSAGE
from app.modules.analytics_module import record_chat_analytics
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.rag_pipeline_utils import build_conversation_log_data
from app.utils.rate_limiter import limiter
from app.utils.logger import logger

agent_conversation_router = APIRouter(prefix="/agent_conversation_router", tags=["agent_conversation_router"])

@agent_conversation_router.post(
    "/agent_conversation",
    summary="Process conversation through the agent router with feedback support and analytics",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access or invalid token"},
        403: {"model": ErrorResponse, "description": "Forbidden, token valid but user/shop mismatch potentially"},
        429: {"model": ErrorResponse, "description": "Too Many Requests"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
@limiter.limit(AGENT_CONVERSATION_RATE_LIMIT)
async def agent_conversation(
    request: Request, 
    payload: AgentConversationPayload,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    try:
        shop_id = request.query_params.get("shopId")
        if not shop_id:
            raise HTTPException(status_code=400, detail="shopId is required.")
        
        app = get_app()

        async with AsyncSessionLocal() as session:    
            shop_id_int= await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_id_int:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if not auth_payload:
            user_id, is_guest = None, True  # Guest
        else:
            try:
                validated_payload = AuthPayloadModel(**auth_payload)
                validated_payload.validate_shop_access(shop_id_int)
                user_id = validated_payload.user_id
                is_guest = validated_payload.is_guest or False
            except (ValidationError, ValueError) as ve:
                logger.warning(f"Auth validation failed: {ve}")
                return {
                    "answer": "Authentication failed.",
                    "products": [],
                    "categories": [],
                    "success": False,
                    "error": str(ve)
                }
            
        guest_id = request.query_params.get("guest_id")
        if is_guest and not guest_id:
            logger.warning("Guest user missing guest_id")
            raise HTTPException(status_code=400, detail="Missing guest_id for guest session")

        contents = payload.messages
        if not isinstance(contents, list) or not all(isinstance(item, dict) for item in contents):
            return {
                "answer": "Invalid 'messages' format. Expected a list of message objects.",
                "products": [],
                "categories": [],
                "success": False
            }
        
        if len(contents) > MESSAGE_LIMIT * 2:
            return {
                "answer": "Your limit is reached", 
                "products": [], 
                "categories": [], 
                "success": False, 
                "limit_reached": True
            }

        user_message = next((m.get('content') for m in reversed(contents) if m.get('role', 'user') == 'user'), None)

        previous_messages = contents[:EXCLUDE_LAST_MESSAGE][PREVIOUS_MESSAGE_CONTEXT_LIMIT:] if len(contents) > 1 else []

        await record_chat_analytics(user_id, shop_id_int, guest_id, payload.location_info)

        agent_response = await app.llm_service.handle_user_message(user_message, shop_id, previous_messages)

        conversation_log_data = build_conversation_log_data(user_message, agent_response, user_id, shop_id_int, is_guest, guest_id )

        conversation_response = await app.conversation_service.record_conversation_into_db(conversation_log_data)
        
        if isinstance(conversation_response, dict) and conversation_response.get("status") == "error":
            logger.warning(f"Conversation logging failed: {conversation_response}")
        else:
            logger.info(f"Conversation stored with ID: {conversation_response}")
    
        return agent_response

    except HTTPException as http_exc:
        logger.warning(f"HTTPException in agent_conversation: {http_exc.detail}")
        return {"answer": f"Request failed: {http_exc.detail}", "products": [], "categories": [], "success": False, "error": http_exc.detail}
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        return {"answer": "I'm having trouble processing your request. Please try again later.", "products": [], "categories": [], "success": False, "error": str(e)}
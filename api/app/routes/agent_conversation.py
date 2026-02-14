from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse, AgentConversationPayload
from app.constants import MESSAGE_LIMIT, AGENT_CONVERSATION_RATE_LIMIT, PREVIOUS_MESSAGE_CONTEXT_LIMIT, EXCLUDE_LAST_MESSAGE
from app.utils.rag_pipeline_utils import build_conversation_log_data, validate_and_get_user_info
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
    background_tasks: BackgroundTasks,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload),
):
    try:
        shop_id = request.state.shop_id
        shop_pk = request.state.shop_pk

        if not shop_id:
            raise HTTPException(status_code=400, detail="shopId is required.")
        
        app = get_app()

        if not auth_payload:
            guest_user_id = request.query_params.get("guest_id")
            if not guest_user_id:
                logger.warning("Guest user missing guest_id")
                raise HTTPException(status_code=400, detail="Missing guest_id for guest session")

            user_record, _ = await app.user_handler.create_guest_if_not_exists(guest_user_id, shop_pk)
            user_id = user_record.id
        else:
            user_id, _, error_response = await validate_and_get_user_info(auth_payload, shop_pk)
            if error_response:
                return error_response

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

        #TODO P1: Below logic is not seems to be proper
        #TODO P1: Please create a doc explaining this logic
        previous_messages = contents[:EXCLUDE_LAST_MESSAGE][PREVIOUS_MESSAGE_CONTEXT_LIMIT:] if len(contents) > 1 else []

        background_tasks.add_task(
            app.analytics_service.record_chat_interaction,
            user_id=user_id,
            shop_pk=shop_pk
        )

        agent_response = await app.llm_service.handle_user_message(user_message, shop_id, previous_messages)

        conversation_log_data = build_conversation_log_data(user_message, agent_response, user_id, shop_pk )

        background_tasks.add_task(
            app.conversation_service.record_conversation_into_db,
            conversation_log_data
        )
    
        return agent_response

    except HTTPException as http_exc:
        logger.warning(f"HTTPException in agent_conversation: {http_exc.detail}")
        return {"answer": f"Request failed: {http_exc.detail}", "products": [], "categories": [], "success": False, "error": http_exc.detail}
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        return {"answer": "I'm having trouble processing your request. Please try again later.", "products": [], "categories": [], "success": False, "error": str(e)}
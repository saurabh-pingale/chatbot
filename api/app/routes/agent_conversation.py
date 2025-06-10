from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, UTC

from app.utils.app_utils import get_app
from app.utils.message_utils import get_last_user_message_content
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse, AgentConversationPayload
from app.dbhandlers.chat_limit_handler import ChatLimitHandler
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.utils.logger import logger
from app.constants import MESSAGE_LIMIT, SESSION_TIMEOUT_HOURS

agent_conversation_router = APIRouter(prefix="/agent_conversation_router", tags=["agent_conversation_router"])
chat_limit_handler = ChatLimitHandler()
shop_admin_handler = ShopAdminHandler()

@agent_conversation_router.post(
    "/agent_conversation",
    summary="Process conversation through the agent router with feedback support and analytics",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access or invalid token"},
        403: {"model": ErrorResponse, "description": "Forbidden, token valid but user/shop mismatch potentially"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def agent_conversation(
    request: Request, 
    payload: AgentConversationPayload,
    _: Dict[str, Any] = Depends(get_current_user_payload)):
    try:
        query_param_shop_id_str = request.query_params.get("shopId")
        if not query_param_shop_id_str:
            raise HTTPException(status_code=400, detail="shopId query parameter is required.")
            
        shop = await shop_admin_handler.get_shop_by_domain(query_param_shop_id_str)
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found.")

        jwt_user_id_pk: Optional[int] = request.state.jwt_user_id
        jwt_shop_id_pk: Optional[int] = request.state.jwt_shop_id
        is_guest: bool = request.state.is_guest

        if not jwt_user_id_pk or not jwt_shop_id_pk:
            raise HTTPException(status_code=401, detail="Token is malformed.")
        if jwt_shop_id_pk != shop.id:
            raise HTTPException(status_code=403, detail="User not authorized for this shop.")

        chat_limit = None
        if not is_guest:
            chat_limit = await chat_limit_handler.get_chat_limit(jwt_user_id_pk)
            
            if chat_limit:
                session_expired = datetime.now(UTC) - chat_limit.session_start_time > timedelta(hours=SESSION_TIMEOUT_HOURS)

                if session_expired:
                    await chat_limit_handler.reset_chat_limit(jwt_user_id_pk)
                    chat_limit = await chat_limit_handler.get_chat_limit(jwt_user_id_pk)
                # else: session still active; use existing chat_limit 

                if chat_limit and chat_limit.message_count >= MESSAGE_LIMIT:
                    static_response_content = "You have reached the message limit. Please try again after some time."
                    
                    if chat_limit.message_count == MESSAGE_LIMIT:
                        user_message = get_last_user_message_content(payload.messages)
                        app = get_app()
                        await app.conversation_service.record_conversation_into_db({
                            "user_query": user_message,
                            "agent_response": static_response_content,
                            "user_id": jwt_user_id_pk,
                            "shop_id": shop.id,
                        })
                        await chat_limit_handler.increment_message_count(jwt_user_id_pk)

                    return {"answer": static_response_content, "products": [], "categories": [], "success": False, "limit_reached": True}

        contents = payload.messages
        if not isinstance(contents, list):
            raise HTTPException(status_code=400, detail="Invalid 'messages' format. Expected a list.")

        user_message = get_last_user_message_content(contents)
        app = get_app()
        
        country, region, city, ip = (None, None, None, None)
        if payload.location_info:
            country, region, city, ip = payload.location_info.country, payload.location_info.region, payload.location_info.city, payload.location_info.ip

        if not is_guest and session_expired:
            analytics_success = await app.analytics_service.record_chat_interaction(
                user_id=jwt_user_id_pk, 
                shop_id=shop.id, 
                country=country, 
                region=region, 
                city=city, 
                ip_address=ip
            )
            if not analytics_success:
                logger.warning(f"Failed to record chat analytics for user_id: {jwt_user_id_pk}, shop_id: {shop.id}")
        
        agent_response = await app.llm_service.handle_user_message(user_message, contents)
        
        await app.conversation_service.record_conversation_into_db({
            "user_query": user_message,
            "agent_response": agent_response.get('answer'),
            "user_id": jwt_user_id_pk,
            "shop_id": shop.id,
        })
        
        if not is_guest:
            current_limit = await chat_limit_handler.get_chat_limit(jwt_user_id_pk)
            if not current_limit:
                await chat_limit_handler.create_chat_limit(jwt_user_id_pk)
            else:
                await chat_limit_handler.increment_message_count(jwt_user_id_pk)

        return agent_response

    except HTTPException as http_exc:
        logger.warning(f"HTTPException in agent_conversation: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        return {"answer": "I'm having trouble processing your request. Please try again later.", "products": [], "categories": [], "success": False, "error": str(e)}
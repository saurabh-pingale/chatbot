from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse, AgentConversationPayload
from app.constants import MESSAGE_LIMIT, AGENT_CONVERSATION_RATE_LIMIT
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
    #TODO: Here lot of things happening, seperate 
    # - auth as auth module
    # - analytics as analytics module
    # - agent response & conversation_log_data as seperate module

    try:
        shop_id = request.query_params.get("shopId")
        if not shop_id:
            raise HTTPException(status_code=400, detail="shopId is required.")
        
        app = get_app()
            
        shop = await app.shop_admin_handler.get_shop_by_domain(shop_id)
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found.")

        guest_id = request.query_params.get("guest_id")
        jwt_user_id_pk = None
        is_guest = True

        if auth_payload:
            jwt_user_id_pk = auth_payload.get("user_id")
            jwt_shop_id_pk = auth_payload.get("shop_id")
            is_guest = auth_payload.get("is_guest", False)

            if not jwt_user_id_pk or not jwt_shop_id_pk:
                raise HTTPException(status_code=401, detail="Token is malformed.")
            if jwt_shop_id_pk != shop.id:
                raise HTTPException(status_code=403, detail="User not authorized for this shop.")

        if len(payload.messages) > MESSAGE_LIMIT * 2:
            static_response_content = "Your limit is reached"
            return {"answer": static_response_content, "products": [], "categories": [], "success": False, "limit_reached": True}

        contents = payload.messages
        if not isinstance(contents, list):
            raise HTTPException(status_code=400, detail="Invalid 'messages' format. Expected a list.")

        user_message = next((m.get('content') for m in reversed(contents) if m.get('role', 'user') == 'user'), None)

        previous_messages = []
        if len(contents) > 1:
            all_previous = contents[:-1]
            previous_messages = all_previous[-3:] if len(all_previous) >= 3 else all_previous
        
        country, region, city, ip = (None, None, None, None)
        if payload.location_info:
            country, region, city, ip = payload.location_info.country, payload.location_info.region, payload.location_info.city, payload.location_info.ip
      
        analytics_success = await app.analytics_service.record_chat_interaction(
            user_id=jwt_user_id_pk, 
            shop_id=shop.id,
            guest_id=guest_id,
            country=country, 
            region=region, 
            city=city, 
            ip_address=ip
        )
        if not analytics_success:
            logger.warning(f"Failed to record chat analytics for user_id: {jwt_user_id_pk}, guest_id: {guest_id}, shop_id: {shop.id}")
        
        agent_response = await app.llm_service.handle_user_message(user_message, shop_id, previous_messages)
        
        conversation_log_data = {
            "user_query": user_message,
            "agent_response": agent_response.get('answer'),
            "user_id": jwt_user_id_pk,
            "shop_id": shop.id,
        }
        if is_guest:
            conversation_log_data["guest_id"] = guest_id

        await app.conversation_service.record_conversation_into_db(conversation_log_data)
        
        return agent_response

    except HTTPException as http_exc:
        logger.warning(f"HTTPException in agent_conversation: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        return {"answer": "I'm having trouble processing your request. Please try again later.", "products": [], "categories": [], "success": False, "error": str(e)}
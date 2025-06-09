from fastapi import APIRouter, Request, HTTPException, Depends
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.utils.message_utils import get_last_user_message_content
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse, AgentConversationPayload
from app.utils.logger import logger

agent_conversation_router = APIRouter(prefix="/agent_conversation_router", tags=["agent_conversation_router"])

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
    decoded_token: Dict[str, Any] = Depends(get_current_user_payload)):
    try:
        query_param_shop_id_str = request.query_params.get("shopId")

        if not query_param_shop_id_str:
            logger.error("shopId query parameter is missing or empty.")
            raise HTTPException(status_code=400, detail="shopId query parameter is required.")

        jwt_user_id_pk: Optional[int] = decoded_token.get("user_id")
        jwt_shop_id_pk: Optional[int] = decoded_token.get("shop_id")

        if not jwt_user_id_pk or not jwt_shop_id_pk:
            logger.error(f"Token is missing user_id or shop_id. Token payload: {decoded_token}")
            raise HTTPException(status_code=401, detail="Token is malformed.")

        contents = payload.messages
        if not isinstance(contents, list):
            logger.error(f"Invalid messages format: {contents}")
            raise HTTPException(status_code=400, detail="Invalid 'messages' format. Expected a list.")

        user_message = get_last_user_message_content(contents)
  
        app = get_app()
        
        country, region, city, ip = (None, None, None, None)
        if payload.location_info:
            country = payload.location_info.country
            region = payload.location_info.region
            city = payload.location_info.city
            ip = payload.location_info.ip

        analytics_success = await app.analytics_service.record_chat_interaction(
            user_id=jwt_user_id_pk,
            shop_id=jwt_shop_id_pk,
            country=country,
            region=region,
            city=city,
            ip_address=ip
        )
        if not analytics_success:
            logger.warning(f"Failed to record chat analytics for user_id: {jwt_user_id_pk}, shop_id: {jwt_shop_id_pk}")
        
        agent_response = await app.llm_service.handle_user_message(user_message, contents)

        await app.conversation_service.record_conversation_into_db({
            "user_query": user_message,
            "agent_response": agent_response.get('answer'),
            "user_id": jwt_user_id_pk,
            "shop_id": jwt_shop_id_pk,
        })

        return agent_response

    except HTTPException as http_exc:
        logger.warning(f"HTTPException in agent_conversation: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        return {
            "answer": "I'm having trouble processing your request. Please try again later.",
            "products": [],
            "categories": [],
            "success": False,
            "error": str(e)
        }
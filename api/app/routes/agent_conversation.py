from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.utils.message_utils import get_last_user_message_content
from app.models.api.agent_router import ErrorResponse
from app.utils.logger import logger

agent_conversation_router = APIRouter(prefix="/agent_conversation_router", tags=["agent_conversation_router"])

@agent_conversation_router.post(
    "/agent_conversation",
    summary="Process conversation through the agent router with feedback support",
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)

async def agent_conversation(request: Request):
    try:
        body = await request.json()
        contents = body["messages"]

        if not isinstance(contents, list):
            logger.error(f"Invalid messages format: {contents}")
            raise HTTPException(status_code=400, detail="Invalid 'messages' format. Expected a list.")

        user_message = get_last_user_message_content(contents)
  
        shopId = request.query_params.get("shopId")
        user_id = request.query_params.get("user_id")
        if not shopId or not user_id:
            logger.error("shopId or user_id query parameter are missing or empty.")
            raise HTTPException(status_code=400, detail="shopId or user_id query parameter are required.")
        
        app = get_app()
        
        agent_response = await app.llm_service.handle_user_message(shopId, user_message, contents)

        await app.conversation_service.store_conversation({
            "user_query": user_message,
            "agent_response": agent_response['answer'],
            "user_id": user_id,
            "shop_id": shopId
        })

        return agent_response
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        return {
            "answer": "I'm having trouble processing your request. Please try again later.",
            "products": [],
            "categories": [],
            "success": False,
            "error": str(e)
        }
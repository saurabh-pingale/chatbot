import json
from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.models.api.agent_router import AgentRouterResponse, ErrorResponse
from app.utils.logger import logger

agent_conversation_router = APIRouter(prefix="/agent_conversation_router", tags=["agent_conversation_router"])

@agent_conversation_router.post(
    "/agent_conversation",
    summary="Process conversation through the agent router with feedback support",
    response_model=AgentRouterResponse,
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

        extract_last_message = next(
            (msg for msg in reversed(contents) if msg["user"] and not msg["agent"]),
            None
        )
        user_message = extract_last_message["user"] if extract_last_message else None
        
        shopId = request.query_params.get("shopId")
        user_id = request.query_params.get("user_id")
        app = get_app()
        
        response = await app.agent_router_service.generate_agent_response(shopId, user_message, contents)

        await app.conversation_service.store_conversation({
            "user_query": user_message,
            "agent_response": json.dumps(response['answer']),
            "user_id": user_id,
            "shop_id": shopId
        })

        return response
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get conversation")
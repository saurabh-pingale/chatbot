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

        # Extract the last user message
        last_message = next(
            (msg for msg in reversed(contents) if msg["user"] and not msg["agent"]),
            None
        )
        user_message = last_message["user"] if last_message else ""
        
        namespace = request.query_params.get("shopId")
        app = get_app()
        
        # return await app.conversation_service.get_conversation(namespace, user_message, contents)
        return await app.agent_router_service.process_message(namespace, user_message, contents)
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get conversation")
from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.models.api.agent_router import AgentRouterResponse, ErrorResponse
from app.utils.logger import logger

agent_router_router = APIRouter(prefix="/agent-router", tags=["agent-router"])

@agent_router_router.post(
    "/conversation",
    summary="Process conversation through the agent router with feedback support",
    response_model=AgentRouterResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)

async def conversation(request: Request):
    try:
        body = await request.json()
        contents = body["messages"][0]["content"]
        
        namespace = request.query_params.get("shopId")
        
        app = get_app()
        return await app.agent_router_service.process_message(namespace, contents)
    except Exception as e:
        logger.error(f"Error in agent router conversation endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get conversation")

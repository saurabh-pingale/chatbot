from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.utils.app_utils import get_app
from app.middleware.auth import require_auth
from app.models.api.rag_pipeline import ErrorResponse, RagPipelineRequestBody, RagPipelineResponse
from app.services.rag_pipeline_service import RagPipelineService
from app.utils.logger import logger
from app.utils.logger import logger
from app.utils.logger import logger


rag_pipeline_router = APIRouter(prefix="/rag-pipeline", tags=["rag-pipeline"])

@rag_pipeline_router.post(
    "/conversation",
    summary="Process RAG pipeline conversation request",
    response_model=RagPipelineResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
# @require_auth
async def conversation(
    request: Request,
    # body: RagPipelineRequestBody,
):
    try:
        body = await request.json()
        contents = body["messages"][0]["content"]

        namespace = request.query_params.get("shopId")

        app = get_app()
        return await app.rag_pipeline_service.conversation(namespace, contents)
    except Exception as e:
        logger.error("Error in conversation endpoint: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get conversation")


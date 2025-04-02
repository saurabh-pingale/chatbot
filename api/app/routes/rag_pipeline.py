from fastapi import APIRouter, Request

from app.middleware.auth import require_auth
from app.models.api.rag_pipeline import ErrorResponse, RagPipelineRequestBody, RagPipelineResponse
from app.main import app

rag_pipeline_router = APIRouter(prefix="/rag-pipeline", tags=["rag","pipeline"])

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
@require_auth
async def conversation(
    request: Request,
    body: RagPipelineRequestBody,
):
    body = request.json()
    namespace = body["namespace"]
    contents = body["contents"]

    return await app.rag_pipeline_service.conversation(namespace, contents)

from fastapi import FastAPI
from app.services.rag_pipeline_service import RAGPipelineService

def init_services(app: FastAPI):
    """Initialize and store services in the app state."""
    app.state.rag_pipeline_service = RAGPipelineService()


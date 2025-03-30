from fastapi import FastAPI
from app.services.rag_pipeline_service import RagPipelineService

class CustomFastAPI(FastAPI):
    """Custom FastAPI class to attach services."""
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.rag_pipeline_service = RagPipelineService()

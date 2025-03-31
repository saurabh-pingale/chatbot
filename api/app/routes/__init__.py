from fastapi import FastAPI
from routes.rag_pipeline import rag_pipeline_router
from service1.supabase_controller import router as supabase_router

def init_routes(app: FastAPI):
    app.include_router(rag_pipeline_router)
    app.include_router(supabase_router)
from fastapi import FastAPI
from service1.deepseek_controller import router as deepseek_router
from service1.supabase_controller import router as supabase_router

def register_routes(app: FastAPI):
    app.include_router(deepseek_router)
    app.include_router(supabase_router)
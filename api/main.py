from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from controllers.deepseek_controller import router as deepseek_router
from controllers.supabase_controller import router as supabase_router

app = FastAPI()

app.include_router(deepseek_router)
app.include_router(supabase_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
import os
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from app import create_app
from app.dbhandlers.db import engine
from app.models.db.base import Base
from app.middleware.refresh_token import add_refreshed_token_header

app = create_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Token-Refreshed"],
)

app.middleware("http")(add_refreshed_token_header)

def run_dev_server():
    """Reloadable dev server using import string"""
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

def run_prod_server():
    """Production server"""
    uvicorn.run(app, host="0.0.0.0", port=8000)

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    except Exception as e:
        print(f"Warning: Error during table creation: {e}")

if __name__ == "__main__":
    if os.getenv("DEV_MODE", "true").lower() == "true":
        run_dev_server()
    else:
        run_prod_server()
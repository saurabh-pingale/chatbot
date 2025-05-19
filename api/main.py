import os
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from app import create_app

app = create_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_dev_server():
    """Reloadable dev server using import string"""
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

def run_prod_server():
    """Production server"""
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    if os.getenv("DEV_MODE", "true").lower() == "true":
        run_dev_server()
    else:
        run_prod_server()
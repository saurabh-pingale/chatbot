from app.custom_fastapi import CustmFastAPI

from app.routes.rag_pipeline import rag_pipeline_router
from app.routes.store_admin import store_admin_router
from app.routes.shopify_sync import shopify_sync_router
from app.routes.agent_router import agent_router_router

def init_routes(app: CustmFastAPI):
    app.include_router(rag_pipeline_router)
    app.include_router(store_admin_router)
    app.include_router(shopify_sync_router)
    app.include_router(agent_router_router)
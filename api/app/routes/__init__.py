from app.custom_fastapi import CustmFastAPI

from app.routes.store_admin import store_admin_router
from app.routes.products import products_router
from app.routes.conversation import conversation_router
from app.routes.analytics import analytics_router

def init_routes(app: CustmFastAPI):
    app.include_router(store_admin_router)
    app.include_router(products_router)
    app.include_router(conversation_router)
    app.include_router(analytics_router)
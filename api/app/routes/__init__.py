from app.custom_fastapi import CustmFastAPI
from app.routes.shop_admin import shop_admin_router
from app.routes.products import products_router
from app.routes.agent_conversation import agent_conversation_router
from app.routes.analytics import analytics_router
from app.routes.checkout_product import checkout_product_router
from app.routes.text_training import text_training_router
from app.routes.user_auth import user_auth_router
from app.routes.shop_config import shop_config_router
from app.routes.webhooks import webhook_router

def init_routes(app: CustmFastAPI):
    app.include_router(shop_admin_router)
    app.include_router(products_router)
    app.include_router(agent_conversation_router)
    app.include_router(analytics_router)
    app.include_router(checkout_product_router)
    app.include_router(text_training_router)
    app.include_router(user_auth_router)
    app.include_router(shop_config_router)
    app.include_router(webhook_router)
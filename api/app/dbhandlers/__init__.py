from app.custom_fastapi import CustmFastAPI
from app.dbhandlers.db import create_all_tables

from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.dbhandlers.conversation_handler import ConversationHandler
from app.dbhandlers.checkout_product_handler import CheckoutProductHandler

def init_handlers(app: 'CustmFastAPI'):
    """Initialize handlers in the app state."""
    app.shop_admin_handler = ShopAdminHandler()
    app.rag_pipeline_handler = EmbeddingsHandler()
    app.analytics_handler = AnalyticsHandler()
    app.conversation_handler = ConversationHandler()
    app.checkout_product_handler = CheckoutProductHandler()

    @app.on_event("startup")
    async def on_startup_create_tables():
        await create_all_tables()
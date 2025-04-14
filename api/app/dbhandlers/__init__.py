from app.custom_fastapi import CustmFastAPI

from app.dbhandlers.store_admin_handler import StoreAdminHandler
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.dbhandlers.conversation_handler import ConversationHandler

def init_handlers(app: 'CustmFastAPI'):
    """Initialize handlers in the app state."""
    app.store_admin_handler = StoreAdminHandler()
    app.rag_pipeline_handler = EmbeddingsHandler()
    app.analytics_handler = AnalyticsHandler()
    app.conversation_handler = ConversationHandler()
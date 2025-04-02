from app.custom_fastapi import CustmFastAPI

from app.dbhandlers.store_admin_handler import StoreAdminHandler
from app.dbhandlers.rag_pipeline_handler import RagPipelineHandler

def init_handlers(app: 'CustmFastAPI'):
    """Initialize handlers in the app state."""
    app.store_admin_handler = StoreAdminHandler()
    app.rag_pipeline_handler = RagPipelineHandler()
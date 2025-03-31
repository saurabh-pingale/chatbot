from app.custom_fastapi import CustmFastAPI

# Routes
from app.routes import init_routes

# Services
from app.services.rag_pipeline_service import RAGPipelineService
from app.services.store_admin_service import StoreAdminService

# DBHandlers
from app.dbhandlers.store_admin_handler import StoreAdminHandler


def init_handlers(app: CustmFastAPI):
    """Initialize handlers in the app state."""
    app.store_admin_handler = StoreAdminHandler()


def init_services(app: CustmFastAPI):
    """Initialize services in the app state."""
    app.rag_pipeline_service = RAGPipelineService()
    app.store_admin_service = StoreAdminService()


def create_app() -> CustmFastAPI:
    app = CustmFastAPI(__name__)

    init_handlers(app)
    init_services(app)
    init_routes(app)

    return app

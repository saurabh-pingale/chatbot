from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.custom_fastapi import CustmFastAPI


def init_services(app: 'CustmFastAPI'):
    """Initialize services in the app state."""
    from app.services.rag_pipeline_service import RagPipelineService
    from app.services.store_admin_service import StoreAdminService
    
    app.rag_pipeline_service = RagPipelineService()
    app.store_admin_service = StoreAdminService()

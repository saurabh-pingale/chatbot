from app.custom_fastapi import CustmFastAPI

def init_services(app: CustmFastAPI):
    """Initialize services in the app state."""
    from app.services.rag_pipeline_service import RagPipelineService
    from app.services.store_admin_service import StoreAdminService
    from app.services.agent_router_service import AgentRouterService
    
    app.rag_pipeline_service = RagPipelineService()
    app.store_admin_service = StoreAdminService()
    app.agent_router_service = AgentRouterService()

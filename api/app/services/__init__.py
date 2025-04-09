from app.custom_fastapi import CustmFastAPI

def init_services(app: CustmFastAPI):
    """Initialize services in the app state."""
    from app.services.store_admin_service import StoreAdminService
    from app.services.multi_agent_services.multi_agent_service import MultiAgentService
    from app.services.conversation_service import ConversationService
    from app.services.analytics_service import AnalyticsService
 
    app.store_admin_service = StoreAdminService()
    app.agent_router_service = MultiAgentService()
    app.conversation_service = ConversationService()
    app.analytics_service = AnalyticsService()


from fastapi import FastAPI

class CustmFastAPI(FastAPI):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        from app.services.store_admin_service import StoreAdminService
        from app.services.multi_agent_services.multi_agent_service import MultiAgentService
        from app.services.conversation_service import ConversationService
        from app.services.analytics_service import AnalyticsService
        from app.dbhandlers.store_admin_handler import StoreAdminHandler
        from app.dbhandlers.embeddings_handler import EmbeddingsHandler
        from app.dbhandlers.analytics_handler import AnalyticsHandler

        self.store_admin_service = StoreAdminService()
        self.agent_router_service = MultiAgentService()
        self.conversation_service = ConversationService()
        self.analytics_service = AnalyticsService()
        self.store_admin_handler = StoreAdminHandler()
        self.rag_pipeline_handler = EmbeddingsHandler()
        self.analytics_handler = AnalyticsHandler()

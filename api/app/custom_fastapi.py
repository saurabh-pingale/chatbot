from fastapi import FastAPI

class CustmFastAPI(FastAPI):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        from app.services.shop_admin_service import ShopAdminService
        from app.services.multi_agent_services.multi_agent_service import MultiAgentService
        from app.services.analytics_service import AnalyticsService
        from app.services.conversation_service import ConversationService
        from app.services.checkout_product_service import CheckoutProductService
        from app.dbhandlers.shop_admin_handler import ShopAdminHandler
        from app.dbhandlers.embeddings_handler import EmbeddingsHandler
        from app.dbhandlers.analytics_handler import AnalyticsHandler
        from app.dbhandlers.conversation_handler import ConversationHandler
        from app.dbhandlers.checkout_product_handler import CheckoutProductHandler

        self.shop_admin_service = ShopAdminService()
        self.agent_router_service = MultiAgentService()
        self.analytics_service = AnalyticsService()
        self.conversation_service = ConversationService()
        self.checkout_product_service = CheckoutProductService()
        self.shop_admin_handler = ShopAdminHandler()
        self.rag_pipeline_handler = EmbeddingsHandler()
        self.analytics_handler = AnalyticsHandler()
        self.conversation_handler = ConversationHandler()
        self.checkout_product_handler = CheckoutProductHandler()

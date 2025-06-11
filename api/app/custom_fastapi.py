from fastapi import FastAPI

class CustmFastAPI(FastAPI):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        from app.services.shop_admin_service import ShopAdminService
        from app.services.analytics_service import AnalyticsService
        from app.services.conversation_service import ConversationService
        from app.services.pydantic_service.llm_service import LLMService
        from app.services.checkout_product_service import CheckoutProductService
        from app.services.shop_config_service import ShopConfigService
        from app.dbhandlers.shop_admin_handler import ShopAdminHandler
        from app.dbhandlers.embeddings_handler import EmbeddingsHandler
        from app.dbhandlers.analytics_handler import AnalyticsHandler
        from app.dbhandlers.conversation_handler import ConversationHandler
        from app.dbhandlers.checkout_product_handler import CheckoutProductHandler
        from app.dbhandlers.shop_config_handler import ShopConfigHandler
        from app.dbhandlers.chat_limit_handler import ChatLimitHandler
        from app.dbhandlers.otp_handler import OTPHandler
        from app.dbhandlers.user_handler import UserHandler

        self.shop_admin_service = ShopAdminService()
        self.analytics_service = AnalyticsService()
        self.conversation_service = ConversationService()
        self.llm_service = LLMService()
        self.checkout_product_service = CheckoutProductService()
        self.shop_config_service = ShopConfigService()
        self.shop_admin_handler = ShopAdminHandler()
        self.rag_pipeline_handler = EmbeddingsHandler()
        self.analytics_handler = AnalyticsHandler()
        self.conversation_handler = ConversationHandler()
        self.checkout_product_handler = CheckoutProductHandler()
        self.shop_config_handler = ShopConfigHandler()
        self.chat_limit_handler = ChatLimitHandler()
        self.otp_handler = OTPHandler()
        self.user_handler = UserHandler()

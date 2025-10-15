from app.custom_fastapi import CustmFastAPI

def init_services(app: CustmFastAPI):
    """Initialize services in the app state."""
    from app.services.shop_admin_service import ShopAdminService
    from app.services.pydantic_service.llm_service import LLMService
    from app.services.conversation_service import ConversationService
    from app.services.analytics_service import AnalyticsService
    from app.services.checkout_product_service import CheckoutProductService
    from app.services.shop_config_service import ShopConfigService
    from app.services.country_code_service import CountryCodeService
    from app.services.webhook_service import WebhookService
 
    app.shop_admin_service = ShopAdminService()
    app.llm_service = LLMService()
    app.conversation_service = ConversationService()
    app.analytics_service = AnalyticsService()
    app.checkout_product_service = CheckoutProductService()
    app.shop_config_service = ShopConfigService()
    app.country_code_service = CountryCodeService()
    app.webhook_service = WebhookService()
from app.custom_fastapi import CustmFastAPI

from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.dbhandlers.analytics_handler import AnalyticsHandler
from app.dbhandlers.conversation_handler import ConversationHandler
from app.dbhandlers.checkout_product_handler import CheckoutProductHandler
from app.dbhandlers.shop_config_handler import ShopConfigHandler
from app.dbhandlers.otp_handler import OTPHandler
from app.dbhandlers.user_handler import UserHandler
from app.dbhandlers.country_code_handler import CountryCodeHandler
from app.dbhandlers.webhook_handler import WebhookHandler
from app.dbhandlers.cart_handler import CartHandler

def init_handlers(app: 'CustmFastAPI'):
    """Initialize handlers in the app state."""
    app.shop_admin_handler = ShopAdminHandler()
    app.rag_pipeline_handler = EmbeddingsHandler()
    app.analytics_handler = AnalyticsHandler()
    app.conversation_handler = ConversationHandler()
    app.checkout_product_handler = CheckoutProductHandler()
    app.shop_config_handler = ShopConfigHandler()
    app.otp_handler = OTPHandler()
    app.user_handler = UserHandler()
    app.country_code_handler = CountryCodeHandler()
    app.webhook_handler = WebhookHandler()
    app.cart_handler = CartHandler()
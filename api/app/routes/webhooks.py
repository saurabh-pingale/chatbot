from fastapi import APIRouter, Request, HTTPException, Header, Body
from typing import Dict, Any
import hmac
import hashlib
import base64

from app.utils.app_utils import get_app
from app.utils.logger import logger
from app.config import SHOPIFY_API_SECRET

webhook_router = APIRouter(prefix="/webhooks", tags=["webhooks"])

async def verify_shopify_webhook(request: Request, secret: str):
    """Verify the integrity of a webhook request from Shopify."""
    if not secret:
        logger.error("SHOPIFY_API_SECRET is not configured. Webhook verification cannot proceed.")
        return False
    try:
        hmac_header = request.headers.get('X-Shopify-Hmac-Sha256')
        if not hmac_header:
            logger.error("Webhook verification failed: Missing X-Shopify-Hmac-Sha256 header.")
            return False
        
        raw_body = await request.body()
        
        calculated_hmac = base64.b64encode(hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).digest()).decode()
        
        is_verified = hmac.compare_digest(calculated_hmac, hmac_header)
        if not is_verified:
            logger.warning(f"Webhook HMAC verification failed. Header: {hmac_header}, Calculated: {calculated_hmac}")
        return is_verified
    except Exception as e:
        logger.error(f"Error verifying Shopify webhook: {e}", exc_info=True)
        return False

@webhook_router.post("/orders/create", summary="Webhook for new order creation from Shopify")
async def handle_order_creation(
    request: Request,
    x_shopify_shop_domain: str = Header(...),
    payload: Dict[str, Any] = Body(...)
):
    """
    Handles the 'orders/create' webhook from Shopify.
    Tracks purchases attributed to the chatbot via UTM parameters.
    """
    logger.info(f"Received 'orders/create' webhook for shop: {x_shopify_shop_domain}")
    
    is_verified = await verify_shopify_webhook(request, SHOPIFY_API_SECRET)
    if not is_verified:
        raise HTTPException(status_code=401, detail="Webhook verification failed.")

    try:
        app = get_app()
        
        landing_site = payload.get('landing_site', '')
        utm_source_present = 'utm_source=chatbot' in landing_site
        source_name = payload.get('source_name')
        
        logger.info(f"Order {payload.get('id')} details: source_name='{source_name}', landing_site='{landing_site}', utm_source_present={utm_source_present}")

        if source_name == 'chatbot' or utm_source_present:
            logger.info(f"Chatbot attributed order DETECTED for shop: {x_shopify_shop_domain}, order: {payload.get('id')}")

            shop_domain = x_shopify_shop_domain
            order_id = payload.get('id')
            total_price = float(payload.get('total_price', 0))
            customer_email = payload.get('customer', {}).get('email')

            if customer_email:
                logger.info(f"Attempting to track purchase for email: {customer_email}, amount: {total_price}")
                await app.analytics_service.track_purchase_from_webhook(
                    email=customer_email,
                    shop_identifier=shop_domain,
                    amount=total_price,
                    order_id=str(order_id)
                )
            else:
                logger.warning(f"Order {order_id} for {shop_domain} has no customer email, cannot attribute purchase.")
        else:
            logger.info(f"Order {payload.get('id')} not attributed to chatbot. Skipping tracking.")

        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error processing 'orders/create' webhook: {e}", exc_info=True)
        return {"status": "error", "message": "Internal server error"}, 200
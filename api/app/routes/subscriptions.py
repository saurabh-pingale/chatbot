import stripe
from fastapi import APIRouter, Request, Header, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime

from app.config import STRIPE_WEBHOOK_SECRET, STRIPE_API_KEY, ENTERPRISE_CONTACT_EMAIL
from app.dbhandlers.subscription_handler import SubscriptionHandler
from app.models.db.subscription import SubscriptionStatus
from app.services.shop_admin_service import ShopAdminService
from app.models.api.subscription import CheckoutRequest, ContactRequest, EarlyPlusRequest
from app.utils.email_utils import send_generic_email
from app.utils.logger import logger

stripe.api_key = STRIPE_API_KEY

subscriptions_router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@subscriptions_router.post("/create-checkout-session")
async def create_checkout_session(checkout_request: CheckoutRequest):
    handler = SubscriptionHandler()
    shop = await handler.get_shop_by_shop_id(checkout_request.shop_domain)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    price_ids = {
        "Plus": "price_1RdUPXSJkuFGaNFF7oKOyTvZ"
    }

    price_id = price_ids.get(checkout_request.plan)
    if not price_id or "YOUR_" in price_id:
        raise HTTPException(status_code=400, detail=f"Invalid or missing price ID for plan: {checkout_request.plan}")

    try:
        shop_domain = checkout_request.shop_domain.split('.')[0]
        store_admin_url = f"https://admin.shopify.com/store/{shop_domain}/apps/chatbot-234"

        checkout_session = stripe.checkout.Session.create(
        line_items=[
            {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=f"{store_admin_url}/app/billings?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{store_admin_url}/app/billings",
            client_reference_id=str(shop.id),
            customer_email=shop.owner_email,
            metadata={
                'plan': checkout_request.plan
            }
        )
        return {"checkout_url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@subscriptions_router.post("/request-early-plus")
# async def request_early_plus(request: CheckoutRequest):
async def request_early_plus(request: EarlyPlusRequest):
    handler = SubscriptionHandler()
    shop = await handler.get_shop_by_shop_id(request.shop_domain)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    shop_domain = request.shop_domain
    contact_email = request.email

    subject = f"New Early Plus Plan Inquiry from {shop_domain}"
    html_content = f"""
        <html>
        <body>
            <p>Hi Sales Team,</p>
            <p>The following store has requested to subscribe to the Early Plus plan:</p>
            <ul>
                <li><b>Store Name:</b> {shop_domain}</li>
                <li><b>Contact Email:</b> {contact_email}</li>
                <li><b>Plan Requested:</b> {request.plan}</li>
            </ul>
            <p>Please send them the payment link to start their subscription.</p>
            <br>
            <p>Thank you,</p>
            <p>Your Automated Assistant</p>
        </body>
        </html>
    """
    
    try:
        await send_generic_email(ENTERPRISE_CONTACT_EMAIL, subject, html_content)
        return {"message": "We have received your request for the Early Plus plan. We will share the payment link through your email to start your subscription after the payment."}
    except Exception as e:
        logger.error(f"Failed to send Early Plus plan request email for {shop_domain}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send your request. Please try again later.")


@subscriptions_router.post("/contact-enterprise")
async def contact_enterprise(contact_request: ContactRequest):
    shop_domain = contact_request.shop_domain
    
    subject = f"New Enterprise Plan Inquiry from {shop_domain}"
    html_content = f"""
        <html>
        <body>
            <p>Hi Sales Team,</p>
            <p>The shop <b>{shop_domain}</b> has expressed interest in the Enterprise plan.</p>
            <p>Please reach out to them to discuss their needs.</p>
            <br>
            <p>Thank you,</p>
            <p>Your Automated Assistant</p>
        </body>
        </html>
    """
    
    try:
        await send_generic_email(ENTERPRISE_CONTACT_EMAIL, subject, html_content)
        return {"message": "We have received your request for the Enterprise Plan. We will contact you shortly."}
    except Exception as e:
        logger.error(f"Failed to send enterprise contact email for {shop_domain}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send your request. Please try again later.")

@subscriptions_router.post("/webhook")
async def webhook_received(
    request: Request,
    stripe_signature: str = Header(None)
):
    raw_body = await request.body()
    handler = SubscriptionHandler()

    try:
        event = stripe.Webhook.construct_event(
            payload=raw_body,
            sig_header=stripe_signature,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook Error: {str(e)}")

    event_type = event['type']
    data = event['data']['object']

    if event_type == 'checkout.session.completed':
        session = data
        shop_id = int(session.get('client_reference_id'))
        stripe_customer_id = session.get('customer')
        stripe_subscription_id = session.get('subscription')

        subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        
        plan_name = session.get('metadata', {}).get('plan')
        if not plan_name:
            raise HTTPException(status_code=400, detail="Plan name not found in checkout session metadata.")

        await handler.create_subscription(
            shop_id=shop_id,
            plan=plan_name,
            stripe_subscription_id=stripe_subscription_id,
            stripe_customer_id=stripe_customer_id,
            status=SubscriptionStatus(subscription['status']),
            start_date=datetime.fromtimestamp(subscription['items']['data'][0]['current_period_start']),
            end_date=datetime.fromtimestamp(subscription['items']['data'][0]['current_period_end'])
        )
        
        shop_admin_service = ShopAdminService()
        await shop_admin_service.mark_setup_as_completed(shop_id)
        
        logger.info(f"Subscription created for shop_id: {shop_id}")

    elif event_type in ['customer.subscription.updated', 'customer.subscription.deleted']:
        subscription = data
        stripe_subscription_id = subscription.get('id')
        new_status = SubscriptionStatus(subscription.get('status'))
        
        end_date = None
        if subscription.get('cancel_at_period_end'):
            end_date_ts = subscription.get('cancel_at')
            if end_date_ts:
                end_date = datetime.fromtimestamp(end_date_ts)
            new_status = SubscriptionStatus.CANCELED
        elif event_type == 'customer.subscription.updated':
            end_date_ts = subscription.get('items', {}).get('data', [{}])[0].get('current_period_end')
            if end_date_ts:
                end_date = datetime.fromtimestamp(end_date_ts)

        await handler.update_subscription_status(
            stripe_subscription_id=stripe_subscription_id,
            status=new_status,
            end_date=end_date
        )
        logger.info(f"Subscription {stripe_subscription_id} updated to {new_status.value}")

    else:
        logger.info(f"Unhandled event type {event_type}")

    return JSONResponse(content={"status": "success"})

@subscriptions_router.post("/cancel-subscription")
async def cancel_subscription(request: Request):
    data = await request.json()
    shop_domain = data.get('shop_domain')
    handler = SubscriptionHandler()
    
    shop = await handler.get_shop_by_shop_id(shop_domain)
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    active_subscription = await handler.get_subscription_by_shop_id(shop.id)

    if not active_subscription or active_subscription.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="No active subscription found to cancel.")

    try:
        updated_stripe_subscription = stripe.Subscription.modify(
            active_subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )

        end_date_ts = updated_stripe_subscription.get('cancel_at')
        if not end_date_ts:
            raise ValueError("Could not determine subscription end date from Stripe response.")

        end_date = datetime.fromtimestamp(end_date_ts)
        
        await handler.update_subscription_status(
            stripe_subscription_id=active_subscription.stripe_subscription_id,
            status=SubscriptionStatus.CANCELED,
            end_date=end_date
        )
        
        return {"message": "Subscription cancellation initiated. It will be cancelled at the end of the current billing period."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
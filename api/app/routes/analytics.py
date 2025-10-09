from fastapi import APIRouter, HTTPException, Query, Depends, Body, Request
from datetime import datetime
from typing import Optional, Dict, Any

from app.models.api.shop_admin import ErrorResponse, UserInitiateResponse, UserInitiateRequest, ShopAnalyticsSummaryResponse, TrackPurchaseRequest
from app.models.api.shop_admin import UTMParameters
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.app_utils import get_app
from app.utils.jwt_utils import get_current_user_payload
from app.utils.logger import logger
from app.middleware.auth import get_current_user_payload

analytics_router = APIRouter(prefix="/analytics_router", tags=["analytics_router"])

@analytics_router.post(
    "/initiate_session",
    summary="Initiate user session and get auth token",
    response_model=UserInitiateResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request (e.g., missing fields, invalid email/shopId, shop not found)"},
        500: {"model": ErrorResponse, "description": "Internal server error or failed to create token"},
    },
)
async def initiate_user_session(payload: UserInitiateRequest):
    """Endpoint to handle user email submission, create/find user, and return JWT via AnalyticsService."""
    try:
        app = get_app()

        access_token = await app.analytics_service.process_user_initiation(
            email=payload.email,
            shop_identifier=payload.shopId,
            utm_params=payload.utm_params
        )

        if not access_token:
            logger.error(f"Token generation failed for email: {payload.email}, shopId: {payload.shopId} at route level.")
            raise HTTPException(status_code=500, detail="Failed to initiate user session or create token.")

        return UserInitiateResponse(token=access_token)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as error:
        logger.error(f"Unexpected error in initiate_user_session route: {str(error)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

@analytics_router.get(
    "/analytics",
    summary="Get analytics summary for a shop (total users, total chat interactions)",
    response_model=ShopAnalyticsSummaryResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request (e.g., missing shopId)"},
        404: {"model": ErrorResponse, "description": "Shop not found or no analytics data"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_shop_analytics_summary_route(
    shopId: str = Query(..., description="The string identifier of the shop"),
    startDate: Optional[datetime] = Query(None, description="Start date for filtering analytics"),
    endDate: Optional[datetime] = Query(None, description="End date for filtering analytics")
):
    """
    Endpoint to retrieve aggregated analytics for a shop, with optional date filtering.
    """
    if not shopId:
        raise HTTPException(status_code=400, detail="shopId query parameter is required.")
    
    try:
        app = get_app()
        analytics_data = await app.analytics_service.fetch_shop_analytics_summary(shopId, startDate, endDate)

        if not analytics_data:
            logger.warning(f"No analytics summary returned for shopId {shopId}, likely shop not found.")
            raise HTTPException(status_code=404, detail=f"Shop with identifier {shopId} not found.")
        
        if analytics_data.get("error"):
            logger.error(f"Error reported from service for shop analytics summary {shopId}: {analytics_data.get('error')}")
            return ShopAnalyticsSummaryResponse(
                summary={}, 
                timeseries={"granularity": "daily", "data": []}, 
                error=analytics_data["error"]
            )

        return ShopAnalyticsSummaryResponse(
            summary=analytics_data.get("summary", {}),
            timeseries=analytics_data.get("timeseries", {"granularity": "daily", "data": []})
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error in get_shop_analytics_summary_route for shopId {shopId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching analytics summary.")

@analytics_router.post(
    "/track_opened_chatbot",
    summary="Track when a user opens the chatbot",
    status_code=204,
)
async def track_opened_chatbot(
    payload: Dict[str, Any] = Body(..., example={"user_id": "some_user_id", "shop_id": "some_shop_id", "utm_params": {}})
):
    """Endpoint to track when a user opens the chatbot."""
    logger.info("Received request to track chatbot open.")
    try:
        app = get_app()
        user_id = payload.get("user_id")
        guest_id = payload.get("guest_id")
        shop_id = payload.get("shop_id")
        is_guest = payload.get("is_guest", False)
        utm_data = payload.get("utm_params")
        
        utm_params = UTMParameters(**utm_data) if utm_data else None

        if not shop_id:
            logger.error(f"Track chatbot open request failed: Missing shop_id in payload. Payload: {payload}")
            raise HTTPException(status_code=400, detail="Malformed request payload.")

        if is_guest and not guest_id:
            logger.error(f"Track chatbot open request failed: Missing guest_id for guest user. Payload: {payload}")
            raise HTTPException(status_code=400, detail="Malformed request payload.")

        if not is_guest and not user_id:
            logger.error(f"Track chatbot open request failed: Missing user_id for authenticated user. Payload: {payload}")
            raise HTTPException(status_code=400, detail="Malformed request payload.")

        identifier = guest_id if is_guest else user_id
        logger.info(f"Tracking chatbot open for {'guest_id' if is_guest else 'user_id'}: {identifier}, shop_id: {shop_id}")
        success = await app.analytics_service.track_opened_chatbot(identifier, shop_id, utm_params, is_guest)
        if not success:
            logger.error(f"Analytics service failed to track chatbot open for {'guest_id' if is_guest else 'user_id'}: {identifier}, shop_id: {shop_id}")
            raise HTTPException(status_code=500, detail="Failed to track event due to service error.")

    except HTTPException as http_exc:
        logger.error(f"HTTP exception in track_opened_chatbot: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"Error tracking opened chatbot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to track event.")

@analytics_router.post(
    "/track_added_to_cart",
    summary="Track when a user adds a product to the cart",
    status_code=204,
)
async def track_added_to_cart(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    """Endpoint to track when a user adds a product to the cart. Handles both guests and authenticated users."""
    try:
        app = get_app()
        body = await request.json()
        guest_id = body.get("guest_id")
        user_id, shop_id_pk = None, None

        if auth_payload:
            user_id = auth_payload.get("user_id")
            shop_id_pk = auth_payload.get("shop_id")
        elif guest_id:
            shop_domain = body.get("shop_id")
            if not shop_domain:
                raise HTTPException(status_code=400, detail="Shop ID is required for guests.")
            
            async with AsyncSessionLocal() as session:
                shop_id_pk = await app.analytics_service.get_shop_pk(shop_domain, session)
        else:
            raise HTTPException(status_code=400, detail="Missing user or guest identifier.")

        if not shop_id_pk:
            raise HTTPException(status_code=404, detail="Shop not found.")

        await app.analytics_service.track_added_to_cart(user_id=user_id, shop_id=shop_id_pk, guest_id=guest_id)
    except Exception as e:
        logger.error(f"Error tracking added to cart: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to track event.")

@analytics_router.post(
    "/track_purchase",
    summary="Track a purchase event",
    status_code=204,
)
async def track_purchase(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    """Endpoint to track a purchase event. Handles both guests and authenticated users."""
    try:
        app = get_app()
        body = await request.json()
        guest_id = body.get("guest_id")
        amount = body.get("amount")
        user_id, shop_id_pk = None, None

        if auth_payload:
            user_id = auth_payload.get("user_id")
            shop_id_pk = auth_payload.get("shop_id")
        elif guest_id:
            shop_domain = body.get("shop_id")
            if not shop_domain:
                raise HTTPException(status_code=400, detail="Shop ID is required for guests.")
            
            async with AsyncSessionLocal() as session:
                shop_id_pk = await app.analytics_service.get_shop_pk(shop_domain, session)
        else:
            raise HTTPException(status_code=400, detail="Missing user or guest identifier.")

        if not shop_id_pk or amount is None:
            raise HTTPException(status_code=400, detail="Shop ID and amount are required.")

        await app.analytics_service.track_purchase(user_id=user_id, shop_id=shop_id_pk, guest_id=guest_id, amount=amount)
    except Exception as e:
        logger.error(f"Error tracking purchase: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to track event.")
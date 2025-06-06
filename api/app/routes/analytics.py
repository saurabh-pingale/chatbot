from fastapi import APIRouter, HTTPException, Query

from app.utils.app_utils import get_app
from app.models.api.shop_admin import ErrorResponse, UserInitiateResponse, UserInitiateRequest, ShopAnalyticsSummaryResponse
from app.utils.logger import logger

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
            shop_identifier=payload.shopId
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
async def get_shop_analytics_summary_route(shopId: str = Query(..., description="The string identifier of the shop")):
    """
    Endpoint to retrieve aggregated analytics (total users, total chat interactions) for a shop.
    """
    if not shopId:
        raise HTTPException(status_code=400, detail="shopId query parameter is required.")
    
    try:
        app = get_app()
        summary_data = await app.analytics_service.fetch_shop_analytics_summary(shopId)

        if summary_data is None:
            logger.warning(f"No analytics summary returned for shopId {shopId}, likely shop not found.")
            raise HTTPException(status_code=404, detail=f"Shop with identifier {shopId} not found or no data available.")
        
        if summary_data.get("error"):
            logger.error(f"Error reported from service for shop analytics summary {shopId}: {summary_data.get('error')}")
            raise HTTPException(status_code=500, detail="Failed to retrieve analytics summary due to an internal error.")

        return ShopAnalyticsSummaryResponse(
            total_users=summary_data.get("total_users", 0),
            total_chat_interactions=summary_data.get("total_chat_interactions", 0)
        )

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error in get_shop_analytics_summary_route for shopId {shopId}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while fetching analytics summary.")
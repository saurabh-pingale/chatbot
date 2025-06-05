from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from app.utils.app_utils import get_app
from app.utils.logger import logger
from app.models.api.shop_admin import ErrorResponse

analytics_router = APIRouter(prefix="/analytics_router", tags=["analytics_router"])

@analytics_router.post(
    "/analytics",
    summary="Store analytics",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def store_session_analytics(request: Request, analytics_data: Dict):
    """Endpoint to store analytics."""
    try:
        app = get_app()
        query_shop_id = request.query_params.get("shopId")
        if not query_shop_id and not analytics_data.get('shop_id'):
             raise HTTPException(status_code=400, detail="shopId is required either as a query parameter or in the payload as shop_id")
        
        final_shop_id = query_shop_id if query_shop_id else analytics_data.get('shop_id')
        
        if 'shop_id' not in analytics_data or analytics_data['shop_id'] != final_shop_id:
            analytics_data['shop_id'] = final_shop_id
            logger.info(f"Aligned shop_id in analytics_data to: {final_shop_id}")

        success = await app.analytics_service.store_analytics(analytics_data)
        if not success:
                raise HTTPException(status_code=500, detail="Failed to store analytics")
        return {"message": "Analytics stored successfully"}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as error:
        logger.error("Error in store_analytics: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process analytics")

@analytics_router.get(
    "/analytics",
    summary="Get aggregated analytics summary for a shop",
    response_model=Dict[str, Any],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request (e.g., missing shopId)"},
        404: {"model": ErrorResponse, "description": "Analytics data not found for shopId"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_analytics_summary(request: Request):
    """Endpoint to retrieve aggregated analytics data for a shop."""
    try:
        app = get_app()
        shop_id = request.query_params.get("shopId")
        if not shop_id:
            raise HTTPException(status_code=400, detail="shopId query parameter is required")

        logger.info(f"Fetching analytics summary for shopId: {shop_id}")
        summary_data = await app.analytics_service.get_aggregated_analytics(shop_id)
        
        if not summary_data or summary_data.get("error"):
            logger.warning(f"No analytics data found or error for shopId {shop_id}: {summary_data.get('error')}")

        return summary_data
    except HTTPException as http_exc:
        raise http_exc
    except Exception as error:
        logger.error(f"Error in get_analytics_summary for shopId {shop_id if 'shop_id' in locals() else 'unknown'}: {str(error)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics summary")
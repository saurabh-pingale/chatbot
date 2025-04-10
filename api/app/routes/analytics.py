from typing import Dict
from fastapi import APIRouter, Request, HTTPException
from app.utils.app_utils import get_app
from app.utils.logger import logger
from app.models.api.store_admin import ErrorResponse

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
        shop_id = request.query_params.get("shopId")
        analytics_data['store_id'] = shop_id
        success = await app.analytics_service.store_session_analytics(analytics_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store analytics")
        return {"message": "Analytics stored successfully"}
    except Exception as error:
        logger.error("Error in store_analytics: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process analytics")
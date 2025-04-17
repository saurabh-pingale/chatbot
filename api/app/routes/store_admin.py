from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.models.api.store_admin import (
    ColorPreferenceResponse,
    ErrorResponse,
)
from app.utils.logger import logger

store_admin_router = APIRouter(prefix="/store-admin", tags=["store", "admin"])

@store_admin_router.get(
    "/color-preference",
    summary="Color preference for shopify store admin",
    response_model=ColorPreferenceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_color_preference(request: Request):
    shopId = request.query_params.get("shopId")
    try:
        app = get_app()
        color = await app.store_admin_service.get_color_preference(shopId)
        return {"color": color}
    except Exception as error:
        logger.error("Error in get_color_preference: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch color preference")
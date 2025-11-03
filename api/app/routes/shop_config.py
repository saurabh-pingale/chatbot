from fastapi import APIRouter, Query, HTTPException

from app.models.api.shop_config import ShopConfigResponse, StoreAccessTokenRequest
from app.utils.app_utils import get_app
from app.utils.logger import logger

shop_config_router = APIRouter(prefix="/shop_config_router", tags=["shop_config_router"])

@shop_config_router.get("/config", response_model=ShopConfigResponse)
async def get_shop_config(
    shop_id: str = Query(..., description="The shop's unique identifier")
):
    """
    Retrieves consolidated shop configuration settings.
    """
    cleaned_shop_id = shop_id.split('?')[0]
    app = get_app()
    config = await app.shop_config_service.get_shop_config(cleaned_shop_id)
    return config 

@shop_config_router.post("/store-access-token")
async def store_access_token(
    body: StoreAccessTokenRequest,
    shop_id: str = Query(..., description="The shop's unique identifier"),
):
    """
    Stores or updates the Shopify access token for the shop.
    """
    cleaned_shop_id = shop_id.split('?')[0]
    try:
        app = get_app()
        success = await app.shop_config_service.store_shopify_access_token(cleaned_shop_id, body.access_token)
        if not success:
            raise HTTPException(status_code=404, detail="Shop not found")
        return {"success": True, "message": "Access token stored successfully"}
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error storing access token for shop {cleaned_shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to store access token")
from fastapi import APIRouter, HTTPException, Request

from app.models.api.shop_config import ShopConfigResponse, StoreAccessTokenRequest
from app.utils.app_utils import get_app
from app.utils.logger import logger

shop_config_router = APIRouter(prefix="/shop_config_router", tags=["shop_config_router"])

@shop_config_router.get("/config", response_model=ShopConfigResponse)
async def get_shop_config(
    request: Request,
):
    """
    Retrieves consolidated shop configuration settings.
    """
    shop_id = request.state.shop_id

    app = get_app()
    config = await app.shop_config_service.get_shop_config(shop_id)
    return config 

@shop_config_router.post("/store-access-token")
async def store_access_token(
    request: Request,
    body: StoreAccessTokenRequest,
):
    """
    Stores or updates the Shopify access token for the shop.
    """
    shop_id = request.state.shop_id
    try:
        app = get_app()
        success = await app.shop_config_service.store_shopify_access_token(shop_id, body.access_token)
        if not success:
            raise HTTPException(status_code=404, detail="Shop not found")
        return {"success": True, "message": "Access token stored successfully"}
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Error storing access token for shop {shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to store access token")
from fastapi import APIRouter, Query

from app.models.api.shop_config import ShopConfigResponse
from app.utils.app_utils import get_app

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

#TODO - Remove it, just to test and verify deployment added it 
@shop_config_router.get("/config/status")
def get_shop_config_status():
    return {"success": True}
from fastapi import APIRouter, Request, HTTPException, Header
from app.services.shopify_sync_service import ShopifySyncService
from app.utils.app_utils import get_app
from app.utils.logger import logger

shopify_sync_router = APIRouter(prefix="/shopify-sync", tags=["shopify-sync"])

@shopify_sync_router.post(
    "/sync-products",
    summary="Sync products from Shopify to Vector DB",
    responses={
        500: {"description": "Internal server error"},
    },
)
async def sync_products(
    request: Request,
    x_shopify_store: str = Header(..., alias="X-Shopify-Store"),
    x_shopify_access_token: str = Header(..., alias="X-Shopify-Access-Token")
):
    """Fetch products from Shopify, generate embeddings and store in Vector DB"""
    try:
        if not x_shopify_store or not x_shopify_access_token:
            raise HTTPException(
                status_code=400,
                detail="Both X-Shopify-Store and X-Shopify-Access-Token headers are required"
            )

        app = get_app()
        shopify_sync_service = ShopifySyncService(
            shopify_store=x_shopify_store,
            shopify_access_token=x_shopify_access_token
        )

        body = await request.json()
        namespace = body.get("namespace", x_shopify_store)
        
        result = await shopify_sync_service.sync_products_to_vector_db(namespace)
        return result
        
    except Exception as e:
        logger.error(f"Error in sync-products endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to sync products")
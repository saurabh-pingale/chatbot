from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
import uuid
import json

from app.services.products_service import ProductsService
from app.external_service.redis_client import get_redis_client
from app.utils.logger import logger

products_router = APIRouter(prefix="/products_router", tags=["products_router"])

@products_router.post(
    "/create",
    summary="Sync products from Shopify to Vector DB",
    responses={
        500: {"description": "Internal server error"},
    },
)
async def create(
    request: Request,
    background_tasks: BackgroundTasks,
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

        products_service = ProductsService(
            shopify_store=x_shopify_store,
            shopify_access_token=x_shopify_access_token
        )

        body = await request.json()
        namespace = body.get("namespace", x_shopify_store)

        task_id = str(uuid.uuid4())

        background_tasks.add_task(products_service.create, namespace, task_id)

        return {"task_id": task_id, "shop_id": namespace}
        
    except Exception as e:
        logger.error(f"Error in sync-products endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to sync products")
    
@products_router.get(
    "/create/status/{task_id}", 
    summary="Get the status of a product sync task"
)
async def get_create_status(task_id: str, request: Request):
    """Poll for the status of the product creation task."""
    try:
        shop_id = request.headers.get("x-shopify-store")
        if not shop_id:
            return {"error": "Missing x-shopify-store header"}
        
        redis_client = await get_redis_client()

        redis_key = f"task_progress_{shop_id}_{task_id}"
        progress_data = await redis_client.get(redis_key)
        
        if progress_data is None:
            return {
                "percentage": 0,
                "message": "Initializing...",
                "status": "pending"
            }
            
        return json.loads(progress_data)

    except Exception as e:
        logger.error(f"Error fetching task status for {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch task status")

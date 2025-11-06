from fastapi import APIRouter, Request, HTTPException, Header, BackgroundTasks
import uuid
import json

from app.services.products_service import ProductsService
from app.external_service.redis_client import get_redis_client
from app.constants import TASK_STALLED_TIMEOUT_MINUTES
from app.utils.products_utils import cleanup_stale_task_before_start, check_and_update_stalled_status
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
    x_shopify_store: str = Header(..., alias="X-Shopify-Store")
):
    """Fetch products from Shopify, generate embeddings and store in Vector DB"""
    try:
        if not x_shopify_store:
            raise HTTPException(
                status_code=400,
                detail="X-Shopify-Store header is required"
            )
        
        shop_pk = getattr(request.state, 'shop_pk', None)
        if not shop_pk:
            raise HTTPException(status_code=404, detail=f"Shop with domain {x_shopify_store} not found.")
        
        redis_client = await get_redis_client()
        lock_key = f"task_lock_{x_shopify_store}"

        await cleanup_stale_task_before_start(redis_client, x_shopify_store, TASK_STALLED_TIMEOUT_MINUTES)

        # Try to acquire a lock that expires in 1 hour (3600s)
        # SETNX (set if not exists) is an atomic operation.
        is_lock_acquired = await redis_client.set(lock_key, "locked", ex=3600, nx=True)
        if not is_lock_acquired:
            raise HTTPException(
                status_code=409,
                detail="A product sync is already in progress for this store. Please wait for it to complete."
            )

        products_service = ProductsService(shopify_store=x_shopify_store)

        body = await request.json()
        namespace = body.get("namespace", x_shopify_store)

        task_id = str(uuid.uuid4())

        background_tasks.add_task(products_service.create, namespace, task_id, lock_key, shop_pk=shop_pk)

        return {"task_id": task_id, "shop_id": namespace}
        
    except Exception as e:
        logger.error(f"Error in sync-products endpoint: {e}", exc_info=True)
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail="Failed to sync products")
    
@products_router.get(
    "/create/status/{task_id}", 
    summary="Get the status of a product sync task"
)
async def get_create_status(task_id: str, request: Request):
    """Poll for the status of the product creation task."""
    try:
        shop_id = getattr(request.state, 'shop_id', request.headers.get("x-shopify-store"))
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

        task_details = json.loads(progress_data)

        if task_details.get("shop_id") != shop_id:
            raise HTTPException(status_code=403, detail="Access denied for this task.")
        
        task_details = check_and_update_stalled_status(task_details)
        
        return task_details

    except Exception as e:
        logger.error(f"Error fetching task status for {task_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch task status")

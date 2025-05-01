from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.utils.logger import logger
from app.utils.checkout_product_utils import SuccessResponse, ErrorResponse

checkout_product_router = APIRouter(prefix="/checkout_product", tags=["checkout_product"])

@checkout_product_router.post(
    "/user-checkout",
    summary="Store user checkout product data",
    response_model=SuccessResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def store_checkout_products(request: Request):
    shop_id = request.query_params.get("store_name")  
    user_email = request.query_params.get("user_email")  

    body = await request.json()

    product_id = body.get("product_id") 
    product_count = body.get("product_count")

    if not product_id or not product_count:
        raise HTTPException(status_code=400, detail="Missing product details")

    try:
        app = get_app()
        response = await app.checkout_product_service.store_checkout_product(
            shop_id, user_email, product_id, product_count
        )
        if response.get("success"):
            return {"success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to store checkout product")
    except Exception as error:
        logger.error(f"Error in store_checkout_products route: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@checkout_product_router.delete(
    "/user-checkout",
    summary="Remove a checkout product from the cart",
    response_model=SuccessResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Product not found in cart"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def remove_checkout_product(request: Request):
    body = await request.json()
    
    product_id = body.get("productId")

    if not product_id:
        raise HTTPException(status_code=400, detail="Missing user email or product title")

    try:
        app = get_app()
        result = await app.checkout_product_service.remove_checkout_product(product_id)
        if result.get("success"):
            return {"success": True}
        else:
            raise HTTPException(status_code=404, detail=result.get("error", "Product not found in cart"))
    except Exception as e:
        logger.error(f"Error removing product: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
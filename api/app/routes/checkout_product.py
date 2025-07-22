from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import ValidationError
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse
from app.models.api.shop_admin import AuthPayloadModel
from app.utils.checkout_product_utils import SuccessResponse, ErrorResponse
from app.utils.logger import logger

checkout_product_router = APIRouter(tags=["checkout_product"])

@checkout_product_router.post(
    "/user-checkout",
    summary="Store user checkout product data",
    response_model=SuccessResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def store_checkout_products(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = request.query_params.get("shop_id") 
    guest_id = request.query_params.get("guest_id")

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    body = await request.json()
    variant_id = body.get("product_id") 
    product_count = body.get("product_count")

    if not variant_id or not product_count:
        raise HTTPException(status_code=400, detail="Missing product details")

    try:
        app = get_app()
        user_id = None
        is_guest = True

        shop_pk = await app.analytics_handler.get_shop_pk(shop_id)
        if not shop_pk:
            raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            try:
                validated_payload = AuthPayloadModel(**auth_payload)
                validated_payload.validate_shop_access(shop_pk)
                user_id = validated_payload.user_id
                is_guest = validated_payload.is_guest or False
            except (ValidationError, ValueError) as ve:
                logger.warning(f"Auth validation failed: {ve}")
                raise HTTPException(status_code=403, detail="Unauthorized access")

        if is_guest and not guest_id:
            raise HTTPException(status_code=400, detail="Missing guest_id for guest user")

        response = await app.checkout_product_service.store_checkout_product(
            shop_id, user_id, guest_id, variant_id, product_count
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
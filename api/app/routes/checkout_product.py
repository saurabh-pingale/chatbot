from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import ValidationError
from typing import Optional, Dict, Any

from app.utils.app_utils import get_app
from app.middleware.auth import get_current_user_payload
from app.models.api.agent_router import ErrorResponse
from app.models.api.shop_admin import AuthPayloadModel
from app.dbhandlers.db import AsyncSessionLocal
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

        async with AsyncSessionLocal() as session:
            shop_pk = await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            try:
                validated_payload = AuthPayloadModel(**auth_payload)
                validated_payload.validate_shop_access(shop_pk)
                user_id = validated_payload.user_id
            except (ValidationError, ValueError) as ve:
                logger.warning(f"Auth validation failed: {ve}")
                raise HTTPException(status_code=403, detail="Unauthorized access")
            
        elif guest_id:
            guest_user, _ = await app.user_handler.create_guest_if_not_exists(guest_id, shop_pk)
            user_id = guest_user.id
        else:
            raise HTTPException(status_code=400, detail="Missing user_id or guest_id")

        response = await app.checkout_product_service.store_checkout_product(
            shop_id=shop_id, user_id=user_id, variant_id=variant_id, product_count=product_count
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
async def remove_checkout_product(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = request.query_params.get("shop_id") 
    guest_id = request.query_params.get("guest_id")

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    body = await request.json()
    variant_id = body.get("product_id") 

    if not variant_id:
        raise HTTPException(status_code=400, detail="Missing product details")

    try:
        app = get_app()
        user_id = None

        async with AsyncSessionLocal() as session:
            shop_pk = await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            try:
                validated_payload = AuthPayloadModel(**auth_payload)
                validated_payload.validate_shop_access(shop_pk)
                user_id = validated_payload.user_id
            except (ValidationError, ValueError) as ve:
                logger.warning(f"Auth validation failed: {ve}")
                raise HTTPException(status_code=403, detail="Unauthorized access")

        elif guest_id:
            guest_user, _ = await app.user_handler.create_guest_if_not_exists(guest_id, shop_pk)
            user_id = guest_user.id
        else:
            raise HTTPException(status_code=400, detail="Missing guest_id for guest user")

        response = await app.checkout_product_service.remove_checkout_product(
            shop_id=shop_id, user_id=user_id, variant_id=variant_id
        )
        if response.get("success"):
            return {"success": True}
        else:
            raise HTTPException(status_code=404, detail=response.get("error", "Product not found in cart"))
    except Exception as e:
        logger.error(f"Error removing product: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
    
@checkout_product_router.get(
    "/latest-inventory",
    summary="Get and sync latest inventory for a variant",
    response_model=Dict[str, int],
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Shop or variant not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_latest_inventory(
    request: Request,
):
    shop_id = request.query_params.get("shop_id")
    variant_id_str = request.query_params.get("variant_id")

    if not shop_id or not variant_id_str:
        raise HTTPException(status_code=400, detail="Missing shop_id or variant_id")

    try:
        variant_id = int(variant_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid variant_id")

    try:
        app = get_app()
        async with AsyncSessionLocal() as session:
            shop_pk = await app.shop_config_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")
            
            latest_quantity = await app.checkout_product_service.get_latest_inventory(
                shop_id=shop_id, shop_pk=shop_pk, variant_id=variant_id, session=session
            )

            return {"quantity": latest_quantity}
    except Exception as e:
        logger.error(f"Error fetching latest inventory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
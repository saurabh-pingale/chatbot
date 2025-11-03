from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any, Optional

from app.utils.app_utils import get_app
from app.middleware.auth import get_current_user_payload
from app.models.api.shop_admin import AuthPayloadModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

cart_router = APIRouter(prefix="/cart", tags=["cart"])

@cart_router.get("", response_model=List[Dict[str, Any]])
async def get_cart(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = request.query_params.get("shop_id")
    guest_id = request.query_params.get("guest_id")

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    try:
        app = get_app()
        user_id = None

        async with AsyncSessionLocal() as session:
            shop_pk = await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            validated_payload = AuthPayloadModel(**auth_payload)
            validated_payload.validate_shop_access(shop_pk)
            user_id = validated_payload.user_id
        elif guest_id:
            guest_user, _ = await app.user_handler.create_guest_if_not_exists(guest_id, shop_pk)
            user_id = guest_user.id
        else:
            raise HTTPException(status_code=400, detail="Missing auth or guest_id")

        cart_items = await app.cart_service.load_cart(shop_id, user_id)
        return cart_items
    except Exception as e:
        logger.error(f"Error fetching cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cart")

@cart_router.post("/items", response_model=Dict[str, Any])
async def add_cart_item(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = request.query_params.get("shop_id")
    guest_id = request.query_params.get("guest_id")

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    body = await request.json()
    variant_id = body.get("variant_id")
    quantity = body.get("quantity", 1)

    if not variant_id or quantity < 1:
        raise HTTPException(status_code=400, detail="Missing variant_id or quantity")

    try:
        app = get_app()
        user_id = None

        async with AsyncSessionLocal() as session:
            shop_pk = await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            validated_payload = AuthPayloadModel(**auth_payload)
            validated_payload.validate_shop_access(shop_pk)
            user_id = validated_payload.user_id
        elif guest_id:
            guest_user, _ = await app.user_handler.create_guest_if_not_exists(guest_id, shop_pk)
            user_id = guest_user.id
        else:
            raise HTTPException(status_code=400, detail="Missing auth or guest_id")

        await app.checkout_product_service.store_checkout_product(shop_id, user_id, variant_id, quantity)

        updated_item = await app.cart_service.add_to_cart(shop_id, user_id, variant_id, quantity)
        return updated_item
    except Exception as e:
        logger.error(f"Error adding cart item: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item")

@cart_router.delete("/items/{variant_id}")
async def remove_cart_item(
    variant_id: int,
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = request.query_params.get("shop_id")
    guest_id = request.query_params.get("guest_id")

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    try:
        app = get_app()
        user_id = None

        async with AsyncSessionLocal() as session:
            shop_pk = await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            validated_payload = AuthPayloadModel(**auth_payload)
            validated_payload.validate_shop_access(shop_pk)
            user_id = validated_payload.user_id
        elif guest_id:
            guest_user, _ = await app.user_handler.create_guest_if_not_exists(guest_id, shop_pk)
            user_id = guest_user.id
        else:
            raise HTTPException(status_code=400, detail="Missing auth or guest_id")

        await app.checkout_product_service.remove_checkout_product(shop_id, user_id, variant_id)

        success = await app.cart_service.remove_from_cart(shop_id, user_id, variant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Item not found in cart")

        return {"success": True}
    except Exception as e:
        logger.error(f"Error removing cart item: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove item")

@cart_router.post("/clear")
async def clear_cart(
    request: Request,
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = request.query_params.get("shop_id")
    guest_id = request.query_params.get("guest_id")

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    try:
        app = get_app()
        user_id = None

        async with AsyncSessionLocal() as session:
            shop_pk = await app.analytics_handler.get_shop_pk(shop_id, session)
            if not shop_pk:
                raise HTTPException(status_code=404, detail="Shop not found.")

        if auth_payload:
            validated_payload = AuthPayloadModel(**auth_payload)
            validated_payload.validate_shop_access(shop_pk)
            user_id = validated_payload.user_id
        elif guest_id:
            guest_user, _ = await app.user_handler.create_guest_if_not_exists(guest_id, shop_pk)
            user_id = guest_user.id
        else:
            raise HTTPException(status_code=400, detail="Missing auth or guest_id")

        success = await app.cart_service.clear_cart(shop_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cart not found")

        return {"success": True}
    except Exception as e:
        logger.error(f"Error clearing cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cart")
from fastapi import APIRouter, Depends, HTTPException, Depends
from typing import List, Dict, Any, Optional

from app.middleware.auth import get_current_user_payload
from app.models.api.cart import CartRequestParams
from app.utils.auth import resolve_user_id
from app.utils.app_utils import get_app
from app.utils.logger import logger

cart_router = APIRouter(prefix="/cart", tags=["cart"])

@cart_router.get("", response_model=List[Dict[str, Any]])
async def get_cart(
    params: CartRequestParams = Depends(),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = params.shop_id
    guest_id = params.guest_id

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    try:
        app = get_app()
        user_id = await resolve_user_id(shop_id, guest_id, auth_payload)

        cart_items = await app.cart_service.load_cart(shop_id, user_id)
        return cart_items
    except Exception as e:
        logger.error(f"Error fetching cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch cart")

@cart_router.post("/items", response_model=Dict[str, Any])
async def add_cart_item(
    params: CartRequestParams = Depends(),
    body: Dict[str, Any] = Depends(),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = params.shop_id
    guest_id = params.guest_id

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    variant_id = body.get("variant_id")
    quantity = body.get("quantity", 1)

    if not variant_id or quantity < 1:
        raise HTTPException(status_code=400, detail="Missing variant_id or quantity")

    try:
        app = get_app()
        user_id = await resolve_user_id(shop_id, guest_id, auth_payload)

        await app.checkout_product_service.store_checkout_product(shop_id, user_id, variant_id, quantity)

        updated_item = await app.cart_service.add_to_cart(shop_id, user_id, variant_id, quantity)
        return updated_item
    except Exception as e:
        logger.error(f"Error adding cart item: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item")

@cart_router.delete("/items/{variant_id}")
async def remove_cart_item(
    variant_id: int,
    params: CartRequestParams = Depends(),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = params.shop_id
    guest_id = params.guest_id

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    try:
        app = get_app()
        user_id = await resolve_user_id(shop_id, guest_id, auth_payload)

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
    params: CartRequestParams = Depends(),
    auth_payload: Optional[Dict[str, Any]] = Depends(get_current_user_payload)
):
    shop_id = params.shop_id
    guest_id = params.guest_id

    if not shop_id:
        raise HTTPException(status_code=400, detail="Missing shop_id")

    try:
        app = get_app()
        user_id = await resolve_user_id(shop_id, guest_id, auth_payload)

        success = await app.cart_service.clear_cart(shop_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Cart not found")

        return {"success": True}
    except Exception as e:
        logger.error(f"Error clearing cart: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cart")
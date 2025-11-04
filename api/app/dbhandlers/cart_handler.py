from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from sqlalchemy import and_
import uuid
from typing import List, Dict, Any

from app.dbhandlers.db import AsyncSessionLocal
from app.models.db.cart import CartModel, CartItemModel
from app.models.db.shop_admin import ProductModel
from app.dbhandlers.shop_config_handler import ShopConfigHandler
from app.utils.logger import logger

class CartHandler:
    def __init__(self):
        self.shop_config_handler = ShopConfigHandler()

    async def get_or_create_cart(self, shop_id: str, user_id: uuid.UUID, session) -> CartModel:
        """Get existing cart or create new for user/shop."""
        shop_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
        if not shop_pk:
            raise ValueError("Shop not found")

        stmt = select(CartModel).where(CartModel.user_id == user_id, CartModel.shop_id == shop_pk)
        result = await session.execute(stmt)
        cart = result.scalars().first()

        if not cart:
            cart = CartModel(user_id=user_id, shop_id=shop_pk)
            session.add(cart)
            await session.flush()
        return cart

    async def fetch_cart_items(self, user_id: uuid.UUID, shop_id: str) -> List[Dict[str, Any]]:
        """Fetch full cart items with details."""
        async with AsyncSessionLocal() as session:
            try:
                shop_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
                if not shop_pk:
                    return []

                stmt = (
                    select(CartItemModel)
                    .options(selectinload(CartItemModel.product))
                    .join(CartModel, CartItemModel.cart_id == CartModel.id)
                    .where(and_(CartModel.user_id == user_id, CartModel.shop_id == shop_pk))
                )
                result = await session.execute(stmt)
                items = result.scalars().all()

                return [
                    {
                        "id": item.id,
                        "variant_id": item.variant_id,
                        "quantity": item.quantity,
                        "price": item.product.price if item.product else 0.0,
                        "name": item.product.title if item.product else "",
                        "image_url": item.product.image if item.product else None,
                        "variant_quantity": item.product.variant_quantity if item.product else 10,
                    }
                    for item in items
                ]
            except Exception as e:
                logger.error(f"Error loading cart: {e}")
                return []

    async def add_or_update_item(self, user_id: uuid.UUID, shop_id: str, variant_id: int, quantity: int, session) -> Dict[str, Any]:
        """Add/update cart item. Returns updated item."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    cart = await self.get_or_create_cart(shop_id, user_id, session)

                    stmt = select(CartItemModel).where(CartItemModel.cart_id == cart.id, CartItemModel.variant_id == variant_id)
                    result = await session.execute(stmt)
                    existing = result.scalars().first()

                    if existing:
                        existing.quantity = quantity
                        existing.updated_at = func.now()
                        updated_item = existing
                    else:
                        new_item = CartItemModel(
                            cart_id=cart.id,
                            variant_id=variant_id,
                            quantity=quantity,
                        )
                        session.add(new_item)
                        updated_item = new_item

                    await session.flush()
                    product = await session.get(ProductModel, variant_id)
                    return {
                        "id": updated_item.id,
                        "variant_id": updated_item.variant_id,
                        "quantity": updated_item.quantity,
                        "price": product.price if product else 0.0,
                        "name": product.title if product else "",
                        "image_url": product.image if product else None,
                    }
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Error adding to cart: {e}")
                    raise

    async def remove_item(self, user_id: uuid.UUID, shop_id: str, variant_id: int, session) -> bool:
        """Remove item by variant_id."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
                    if not shop_pk:
                        return False

                    cart_ids_stmt = select(CartModel.id).where(and_(CartModel.user_id == user_id, CartModel.shop_id == shop_pk))
                    del_stmt = (
                        delete(CartItemModel)
                        .where(and_(CartItemModel.variant_id == variant_id, CartItemModel.cart_id.in_(cart_ids_stmt)))
                    )
                    result = await session.execute(del_stmt)
                    return result.rowcount > 0
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Error removing from cart: {e}")
                    return False

    async def clear_cart(self, user_id: uuid.UUID, shop_id: str, session) -> bool:
        """Clear all items in cart."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
                    if not shop_pk:
                        return False

                    cart_ids_stmt = select(CartModel.id).where(and_(CartModel.user_id == user_id, CartModel.shop_id == shop_pk))
                    del_stmt = delete(CartItemModel).where(CartItemModel.cart_id.in_(cart_ids_stmt))
                    await session.execute(del_stmt)
                    return True
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Error clearing cart: {e}")
                    return False
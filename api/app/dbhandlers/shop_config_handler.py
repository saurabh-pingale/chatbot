from typing import Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.models.db.shop_admin import ShopModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ShopConfigHandler:
    async def get_shop_config(self, shop_id: str) -> Dict[str, Any]:
        """Fetches consolidated shop configuration details."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).filter(ShopModel.shop_id == shop_id)
                    )
                    shop = result.scalars().first()

                    if shop:
                        return {
                            "preferred_color": shop.preferred_color,
                            "image": shop.image,
                            "setup_completed": shop.setup_completed,
                            "plan": shop.plan or "Not Selected",
                            "show_email_gate": shop.show_email_gate,
                            "support_email": shop.support_email,
                            "support_phone": shop.support_phone,
                            "support_country_code": shop.support_country_code,
                            "quick_replies": shop.quick_replies,
                        }
                    else:
                        logger.warning(f"No shop found with id: {shop_id}, returning defaults.")
                        return {
                            "preferred_color": None,
                            "image": None,
                            "setup_completed": False,
                            "plan": "Not Selected",
                            "show_email_gate": None,
                            "support_email": None,
                            "support_phone": None,
                            "support_country_code": None,
                            "quick_replies": [],
                        }
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_shop_config for shop {shop_id}: {error}", exc_info=True)
                    raise 
from typing import List, Dict, Optional
from app.models.api.store_admin import Collection, Product

from app.dbhandlers.store_admin_handler import StoreAdminHandler

class StoreAdminService:
    def __init__(self):
        self.db_handler = StoreAdminHandler()

    async def get_color_preference(self, shop_id: str) -> Optional[str]:
        """Fetch color preference from DB via handler."""
        return await self.db_handler.get_color_preference(shop_id)

    async def store_collections(self, collections: List[Collection]) -> List[dict]:
        """Convert collections to DB format and store."""
        formatted_collections = [
            {
                "title": collection.title,
                "products_count": collection.products_count
            }
            for collection in collections
        ]
        return await self.db_handler.store_collections(formatted_collections)

    async def store_products(self, products: List[Product], collection_id_map: Dict[str, int]) -> None:
        """Convert products to DB format and store."""
        formatted_products = [
            {
                "title": product.title,
                "description": product.description,
                "category": product.category,
                "url": product.url,
                "price": float(product.price) if product.price else None,
                "image": product.image,
                "collection_id": collection_id_map.get(product.category, None)
            }
            for product in products
        ]
        await self.db_handler.store_products(formatted_products)

    async def store_session_analytics(self, session_data: Dict) -> bool:
        """Process and store session analytics data"""
        return await self.db_handler.store_session_data(session_data)

import os
from typing import Optional, List

#TODO - Replace supabase ORM to sqlalchemy ORM
from supabase import create_client, Client
from app.models.api.store_admin import Collection, Product
from app.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

class StoreAdminHandler:
    def __init__(self):
        supabase_url = SUPABASE_URL
        supabase_key = SUPABASE_SERVICE_ROLE_KEY

        if not supabase_url or not supabase_key:
            raise ValueError("Supabase URL and Key must be provided in the environment variables.")

        self.supabase: Client = create_client(supabase_url, supabase_key)

    async def get_color_preference(self, shop_id: str) -> Optional[str]:
        """Fetches color preference for a given shop ID."""
        try:
            response = self.supabase.table("data").select("color").eq("shop_id", shop_id).execute()
            if not response.data:
                print(f"No color preference found for shop: {shop_id}, returning default")
                return None
            [colors]=response.data
            color = colors.get("color")
            return color
        except Exception as error:
            print(f"Supabase error in get_color_preference: {error}")
            raise error

    async def store_collections(self, collections: List[Collection]) -> List[dict]:
        """Stores collections in the database."""
        try:
            supabase_collections = [
                {
                    "title": collection.title,
                    "products_count": collection.products_count
                }
                for collection in collections
            ]
            response = self.supabase.table("collections").upsert(
                supabase_collections, on_conflict="title"
            ).execute()
            return response.data
        except Exception as error:
            print(f"Supabase error in store_collections: {error}")
            raise error

    async def store_products(self, products: List[Product], collection_id_map: dict) -> None:
        """Stores products in the database and links them to collections."""
        try:
            supabase_products = []
            for product in products:
                col_id = collection_id_map.get(product.category)
                product_data = {
                    "title": product.title,
                    "description": product.description,
                    "category": product.category,
                    "url": product.url,
                    "price": float(product.price) if product.price else None,
                    "image": product.image,
                    "collection_id": col_id if col_id else None
                }
                supabase_products.append(product_data)

            self.supabase.table("products").upsert(
                supabase_products, on_conflict="title,category"
            ).execute()
        except Exception as error:
            print(f"Supabase error in store_products: {error}")
            raise error

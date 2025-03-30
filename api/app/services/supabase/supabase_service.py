import os
from typing import Optional, List
from dotenv import load_dotenv
from supabase import create_client, Client
from schemas.models import ShopifyProduct, ShopifyCollection

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Supabase URL and Key must be provided in the environment variables.")

supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

async def get_color_preference_db(shop_id: str) -> Optional[str]:
    try:
        response = supabase.table("data").select("color").eq("shop_id", shop_id).execute()
        
        if not response.data:
            print(f"No color preference found for shop: {shop_id}, returning default")
            return None

        return response.data[0].get("color")
    except Exception as error:
        print(f"Supabase error in get_color_preference: {error}")
        raise error


async def store_collections(collections: List[ShopifyCollection]) -> List[dict]:
    try:
        supabase_collections = [
            {
                "title": collection.title,
                "products_count": collection.products_count
            }
            for collection in collections
        ]
        
        response = supabase.table("collections").upsert(
            supabase_collections,
            on_conflict="title"
        ).execute()
        
        return response.data 
        
    except Exception as error:
        print(f"Supabase error in store_collections: {error}")
        raise

async def store_products(products: List[ShopifyProduct], collection_id_map: dict) -> None:
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
                "collection_id":  col_id if col_id else None
            }
            supabase_products.append(product_data)
        
        response = supabase.table("products").upsert(
            supabase_products,
            on_conflict="title,category" 
        ).execute()
        
    except Exception as error:
        print(f"Supabase error in store_products: {error}")
        raise
import os
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

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

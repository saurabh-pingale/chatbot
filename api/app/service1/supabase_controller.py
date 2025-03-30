import os
from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from services.supabase.supabase_service import get_color_preference_db
from utils.shopify_proxy_utils import verify_app_proxy_signature

router = APIRouter(prefix="/supabase", tags=["supabase"])

@router.get("")
async def get_color_preference(
    request: Request,
    shopId: str = Query(..., alias="shopId"),
    signature: Optional[str] = Query(None)
):
    query_params = dict(request.query_params)
    api_secret = os.getenv("SHOPIFY_API_SECRET", "")
    
    if signature:
        if not verify_app_proxy_signature(query_params, api_secret):
            raise HTTPException(status_code=401, detail="Invalid signature")

    if not shopId:
        raise HTTPException(status_code=400, detail="shopId is required.")

    try:
        color = await get_color_preference_db(shopId)
        return {"color": color}
    except Exception as error:
        print(f"Error in get_color_preference: {error}")
        raise HTTPException(status_code=500, detail="Failed to fetch color preference")


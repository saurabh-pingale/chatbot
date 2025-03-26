from fastapi import Request, HTTPException
from typing import Optional, Dict
from services.shopify.session_service import ShopifySessionService

async def get_shopify_session_for_training(
    request: Request,
    is_training_page: bool,
    auth_header: Optional[str] = None,
    shop_header: Optional[str] = None
) -> Optional[Dict]:
    """Get Shopify session for training operations"""
    if not is_training_page:
        return None
        
    try:
        auth_header = auth_header or request.headers.get("authorization") or request.headers.get("Authorization")
        shop_header = shop_header or request.headers.get("x-shopify-shop") or request.headers.get("X-Shopify-Shop")
        
        if not auth_header or not shop_header:
            raise HTTPException(
                status_code=401,
                detail="Authentication required for training operations",
                headers={"WWW-Authenticate": "Bearer"}
            )
            
        session_service = ShopifySessionService()
        return await session_service.get_current_session(
            request,
            authorization=auth_header,
            x_shopify_shop=shop_header
        )
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication for training operations",
            headers={"WWW-Authenticate": "Bearer"}
        )

def get_shop_namespace(
    request: Request,
    query_params: Optional[Dict] = None,
    session_data: Optional[Dict] = None
) -> Optional[str]:
    shop_header = request.headers.get("x-shopify-shop") or request.headers.get("X-Shopify-Shop")
    if shop_header:
        return shop_header

    query_params = query_params or dict(request.query_params)
    if "shop" in query_params:
        return query_params["shop"]
    
    try:
        session = session_data or request.session.get("shopify")
        if session and "shop" in session:
            return session["shop"]
    except:
        pass
    
    return None
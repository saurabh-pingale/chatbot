from fastapi import Request, HTTPException
from typing import Optional, Dict
from services.shopify.session_service import ShopifySessionService

async def get_shopify_session_for_training(
    request: Request,
    is_training_page: bool,
    auth_header: Optional[str] = None,
    shop_domain: Optional[str] = None
) -> Optional[Dict]:
    
    if not is_training_page:
        return None
        
    try:
        auth_header = auth_header or request.headers.get("authorization") or request.headers.get("Authorization")
        shop_domain = shop_domain or request.headers.get("x-shopify-shop") or request.headers.get("X-Shopify-Shop")
        
        if not auth_header or not shop_domain:
            raise HTTPException(
                status_code=401,
                detail="Authentication required for training operations",
                headers={"WWW-Authenticate": "Bearer"}
            )
            
        session_service = ShopifySessionService()
        return await session_service.get_current_session(
            request,
            authorization=auth_header,
            x_shopify_shop=shop_domain
        )
    except HTTPException as e:
        raise e
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication for training operations",
            headers={"WWW-Authenticate": "Bearer"}
        )

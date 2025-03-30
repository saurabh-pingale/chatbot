from functools import wraps
from fastapi import Request
from app.utils.auth import get_shopify_auth

def require_auth(func):
    """Decorator to enforce Shopify authentication."""
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        shop_auth = await get_shopify_auth(request)
        
        # Attach auth details to the request
        request.shop = shop_auth  

        return await func(request, *args, **kwargs)

    return wrapper

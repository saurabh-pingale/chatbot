from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
 
@limiter.limit("100/minute")
async def rate_limit_dependency(request: Request):
    pass 
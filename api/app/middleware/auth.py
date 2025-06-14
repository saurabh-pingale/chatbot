from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from app.utils.jwt_utils import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user_payload(
    request: Request,    
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None

    token = credentials.credentials
    decoded_token = decode_access_token(token)

    if not decoded_token:
        return None
        
    if "user_id" not in decoded_token or "shop_id" not in decoded_token:
        raise HTTPException(status_code=401, detail="Malformed token.")
    
    request.state.jwt_user_id = decoded_token.get("user_id")
    request.state.jwt_shop_id = decoded_token.get("shop_id")
    request.state.is_guest = decoded_token.get("is_guest", False)
    
    return decoded_token
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
from app.utils.jwt_utils import decode_access_token

bearer_scheme = HTTPBearer()

async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> Dict[str, Any]:
    token = credentials.credentials
    decoded_token = decode_access_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    if "user_id" not in decoded_token or "shop_id" not in decoded_token:
        raise HTTPException(status_code=401, detail="Malformed token.")
    return decoded_token
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
from app.utils.jwt_utils import decode_access_token, create_access_token
from datetime import datetime, timezone

bearer_scheme = HTTPBearer(auto_error=False)

def is_token_expired(decoded_token: Dict[str, Any]) -> bool:
    return "exp" in decoded_token and datetime.fromtimestamp(decoded_token["exp"], tz=timezone.utc) < datetime.now(timezone.utc)

def handle_expired_token(request: Request, decoded_token: Dict[str, Any]) -> Dict[str, Any]:
    new_token = create_access_token(data={
        "user_id": decoded_token["user_id"],
        "shop_id": decoded_token["shop_id"]
    })

    if new_token:
        request.state.new_token = new_token
        new_decoded_token = decode_access_token(new_token)
        if new_decoded_token:
            request.state.decoded_token = new_decoded_token
            return new_decoded_token

    return decoded_token

async def get_current_user_payload(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    if not credentials:
        request.state.decoded_token = None
        return None

    token = credentials.credentials
    decoded_token = decode_access_token(token)

    if not decoded_token:
        request.state.decoded_token = None
        return None

    is_expired = is_token_expired(decoded_token)

    if is_expired:
        decoded_token = handle_expired_token(request, decoded_token)
    
    if "user_id" not in decoded_token or "shop_id" not in decoded_token:
        raise HTTPException(status_code=401, detail="Malformed token.")

    request.state.decoded_token = decoded_token
    request.state.is_expired = is_expired

    return decoded_token
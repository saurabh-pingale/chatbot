from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

from app.utils.jwt_utils import decode_access_token

def user_or_ip_key(request: Request) -> str:
    auth_header = request.headers.get("authorization")
    key = None

    if auth_header:
        try:
            scheme, token = auth_header.split()
            if scheme.lower() == "bearer":
                decoded_token = decode_access_token(token)
                if decoded_token and decoded_token.get("user_id"):
                    key = str(decoded_token.get("user_id"))
        except Exception:
            pass

    if not key:
        guest_id = request.query_params.get("guest_id")
        if guest_id:
            key = f"guest:{guest_id}"
        else:
            key = get_remote_address(request)

    return key

limiter = Limiter(key_func=user_or_ip_key, default_limits=[]) 
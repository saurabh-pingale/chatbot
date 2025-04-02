import jwt
from fastapi import Request, HTTPException
from jose.exceptions import JWTError
from datetime import datetime, timezone, UTC, timedelta

from app.config import SHOPIFY_API_KEY, SHOPIFY_API_SECRET
from app.utils.shopify_proxy_utils import verify_app_proxy_signature

def extract_token(authorization: str):
    """Extract the token from the authorization header."""
    try:
        _, token = authorization.split(" ")
        return token
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Authorization header format")

def validate_token(token: str, shop_domain: str):
    """Decode and validate the Shopify token."""
    try:
        token_payload = jwt.decode(
            token, 
            SHOPIFY_API_SECRET, 
            algorithms=["HS256"],
            audience=SHOPIFY_API_KEY
        )

        if is_missing_required_claims(token_payload):
            raise ValueError("Missing required token claims")

        if token_payload.get('dest') != shop_domain:
            raise ValueError("Shop domain mismatch")

        if datetime.now(timezone.utc) > datetime.fromtimestamp(token_payload['exp'], tz=timezone.utc):
            raise ValueError("Token expired")

        return {
            "shop_domain": shop_domain,
            "access_token": token_payload.get('access_token') or token,
            "expires_at": datetime.fromtimestamp(token_payload['exp'])
        }

    except JWTError:
        return {
            "shop_domain": shop_domain,
            "access_token": token,
            "expires_at": datetime.now(UTC) + timedelta(hours=1)
        }

async def get_shopify_auth(request: Request):
    """Extract and validate Shopify authentication details."""
    signature = request.query_params.get("signature")
    if not signature or not verify_app_proxy_signature(request.query_params, api_secret=SHOPIFY_API_SECRET):
        raise HTTPException(status_code=401, detail="Unauthorized access")

    authorization = request.headers.get("Authorization") or request.headers.get("authorization")
    shop_domain = request.headers.get("X-Shopify-Shop") or request.headers.get("x-shopify-shop")

    if not authorization or not shop_domain:
        raise HTTPException(status_code=401, detail="Missing Shopify authentication headers")

    token = extract_token(authorization)
    return validate_token(token, shop_domain)


def is_missing_required_claims(decoded):
    required_claims = ['dest', 'exp', 'iss', 'sub', 'nbf', 'iat']
    return not all(claim in decoded for claim in required_claims)

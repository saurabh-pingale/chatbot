import os
from typing import Optional
from fastapi import HTTPException, Header, Request
from jose import jwt
from datetime import datetime, timedelta
from jose.exceptions import JWTError

class ShopifySessionService:
    def __init__(self):
        self.api_secret = os.getenv("SHOPIFY_API_SECRET")
        self.api_key = os.getenv("SHOPIFY_API_KEY")
        
    async def get_current_session(
        self,
        request: Request,
        authorization: Optional[str] = Header(None),
        x_shopify_shop: Optional[str] = Header(None)
    ) -> dict:
        auth_header = authorization or request.headers.get("authorization") or request.headers.get("Authorization")
        shop_header = x_shopify_shop or request.headers.get("x-shopify-shop") or request.headers.get("X-Shopify-Shop")
        
        if not auth_header or not shop_header:
            raise HTTPException(
                status_code=401,
                detail="Missing authentication headers",
                headers={"WWW-Authenticate": "Bearer"}
            )   
            
        try:
            token = auth_header.split(" ")[1]
            
            try:
                decoded = jwt.decode(
                    token, 
                    self.api_secret, 
                    algorithms=["HS256"],
                    audience=self.api_key
                )
                
                required_claims = ['dest', 'exp', 'iss', 'sub', 'nbf', 'iat']
                if not all(claim in decoded for claim in required_claims):
                    raise ValueError("Missing required token claims")
                    
                if decoded.get('dest') != shop_header:
                    raise ValueError("Shop domain mismatch")
                
                if datetime.utcnow() > datetime.fromtimestamp(decoded['exp']):
                    raise ValueError("Token expired")
                
                return {
                    "shop": shop_header,
                    "access_token": decoded.get('access_token') or token,
                    "expires_at": datetime.fromtimestamp(decoded['exp'])
                }
            
            except JWTError:
                return {
                    "shop": shop_header,
                    "access_token": token,
                    "expires_at": datetime.utcnow() + timedelta(hours=1)
                }
                
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid session: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"}
            )
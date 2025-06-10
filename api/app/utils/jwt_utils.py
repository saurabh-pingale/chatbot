import jwt
from datetime import datetime, timedelta, UTC
from typing import Optional, Dict, Any

from app.config import JWT_SECRET_KEY
from app.utils.logger import logger

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> Optional[str]:
    """
    Generates a JWT access token.

    Args:
        data: The data to encode into the token.
        expires_delta: Optional timedelta object for token expiration. 
                       Defaults to ACCESS_TOKEN_EXPIRE_DAYS.

    Returns:
        The encoded JWT token as a string, or None if JWT_SECRET_KEY is not set.
    """
    if not JWT_SECRET_KEY:
        logger.error("JWT_SECRET_KEY is not configured or is set to default. Cannot create token.")
        return None

    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire})
    
    try:
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error encoding JWT: {e}", exc_info=True)
        return None

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes a JWT access token.

    Args:
        token: The JWT token string to decode.

    Returns:
        The decoded token payload as a dictionary, or None if decoding fails or key is not set.
    """
    if not JWT_SECRET_KEY:
        logger.error("JWT_SECRET_KEY is not configured or is set to default. Cannot decode token.")
        return None
        
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"Error decoding JWT: {e}", exc_info=True)
        return None 
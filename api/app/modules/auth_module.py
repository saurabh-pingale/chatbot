from fastapi import HTTPException
from typing import Optional, Dict, Any
#TODO: What is this new category called module ?
#TODO: If its logic layer code then keep in services
#TODO: If its query layer code then keep in handlers
#TODO: If its routes layer code then keep in handlers
#TODO: how does it different from all these 3 layers ?

def validate_auth_payload(auth_payload: Optional[Dict[str, Any]], shop_id: int) -> (Optional[int], bool):
    """Validates the auth payload and returns user_id and is_guest flag."""
    if not auth_payload:
        return None, True  # Guest user
    
    user_id = auth_payload.get("user_id")
    token_shop_id = auth_payload.get("shop_id")
    is_guest = auth_payload.get("is_guest", False)

    if not user_id or not token_shop_id:
        raise HTTPException(status_code=401, detail="Token is malformed.")
    if token_shop_id != shop_id:
        raise HTTPException(status_code=403, detail="User not authorized for this shop.")

    return user_id, is_guest
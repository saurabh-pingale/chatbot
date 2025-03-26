import hashlib
import hmac
from urllib.parse import parse_qs

def verify_app_proxy_signature(query_params: dict, api_secret: str) -> bool:
    signature = query_params.get("signature")
    if not signature:
        return False

    params = {k: v for k, v in query_params.items() if k != "signature"}
 
    sorted_params = dict(sorted(params.items()))

    signature_message = "&".join(f"{k}={v}" for k, v in sorted_params.items())

    calculated_hmac = hmac.new(
        api_secret.encode('utf-8'),
        signature_message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(calculated_hmac, signature)
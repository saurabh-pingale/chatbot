# TODO: Test Shopify Order Webhook Locally
#
# This script simulates a Shopify 'orders/create' webhook for local testing.
# Since Shopify doesn't trigger real webhooks during manual testing, this script:
#   - Creates a mock order payload
#   - Signs it with the SHOPIFY_API_SECRET
#   - Sends it to the local /webhooks/orders/create endpoint
#
# For local dev use only. Make sure your backend is running before using this.


import requests
import json
import hmac
import hashlib
import base64
import os

# --- Configuration ---
# This should be your locally running backend URL.
BACKEND_URL = "http://127.0.0.1:8000" 
# This MUST match the SHOPIFY_API_SECRET in your .env file.
SHOPIFY_SECRET = os.getenv("SHOPIFY_API_SECRET", "ba378eb11ce63e11f68e7cbf9b133f25")
# This is your store's identifier, e.g., "test-store-chatbot-main.myshopify.com"
SHOP_DOMAIN = "test-store-chatbot-main.myshopify.com"

# --- Sample Order Payload ---
# This is a simplified version of what Shopify sends.
# The most important part for our test is 'landing_site' with the UTM parameter.
sample_order = {
    "id": 1234567890,
    "source_name": "web",
    "landing_site": f"https://{SHOP_DOMAIN}/?utm_source=chatbot&utm_campaign=fall_sale",
    "total_price": "99.99",
    "customer": {
        "email": "test.customer@example.com"
    }
}

def run_test():
    """
    Sends a simulated 'orders/create' webhook to the local backend.
    """
    if SHOPIFY_SECRET == "your_fallback_secret_if_not_in_env":
        print("ERROR: Please set the SHOPIFY_API_SECRET environment variable in your .env file.")
        return

    endpoint = f"{BACKEND_URL}/webhooks/orders/create"
    payload_bytes = json.dumps(sample_order).encode('utf-8')

    # --- Generate the HMAC Signature (to simulate Shopify's security) ---
    hmac_digest = hmac.new(SHOPIFY_SECRET.encode('utf-8'), payload_bytes, hashlib.sha256).digest()
    hmac_header = base64.b64encode(hmac_digest).decode()

    headers = {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac_header,
        'X-Shopify-Shop-Domain': SHOP_DOMAIN
    }

    print(f"Sending test webhook to: {endpoint}")
    print(f"Payload: {json.dumps(sample_order, indent=2)}")
    print("-" * 30)

    try:
        response = requests.post(endpoint, data=payload_bytes, headers=headers)
        
        print(f"Webhook sent successfully!")
        print(f"   - Status Code: {response.status_code}")
        print(f"   - Response Body: {response.text}")
        print("-" * 30)
        print("Now, check your backend terminal. You should see detailed logs showing that the purchase was tracked.")

    except requests.exceptions.RequestException as e:
        print(f"ERROR: Could not connect to the backend at {BACKEND_URL}.")
        print(f"   - Is your backend server running?")
        print(f"   - Details: {e}")

if __name__ == "__main__":
    run_test() 
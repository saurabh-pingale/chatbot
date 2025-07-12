QDRANT_COLLECTION_NAME = 'chatbot_products'
LANGFUSE_HOST  = "https://cloud.langfuse.com"

TOGETHER_MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.3"
TOGETHER_API_URL = "https://api.together.xyz/v1/chat/completions"

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL_NAME = "claude-3-haiku-20240307"

SHOPIFY_GRAPHQL_URL = "https://{shop}/admin/api/2023-10/graphql.json"

MESSAGE_LIMIT = 10
LOCK_TIME = 1

AGENT_CONVERSATION_RATE_LIMIT = "30/minute" # Equivalent to: 5 requests every 10 seconds

CATEGORY_CACHE_TTL_SECONDS = 86400  # 1 day

TAG_LIBRARY = {
    "Greeting": [
        { "name": "Browse Collections", "description": "Explore all our product collections including latest arrivals and bestsellers" },
        { "name": "Return Policy", "description": "Learn how returns and exchanges work in our store" },
    ],
    "Terms": [
        { "name": "Return Time", "description": "Check how many days you have to return a product" },
        { "name": "Refund Process", "description": "Understand how refunds are processed and timelines" }
    ],
    "Order": [
        { "name": "Track Order", "description": "Track your order with your order ID" },
        { "name": "Order Issues", "description": "Report missing or damaged items in your order" },
        { "name": "Contact Support", "description": "Chat or call our support team for help" },
        { "name": "FAQs", "description": "Find answers to common questions" }
    ]
}
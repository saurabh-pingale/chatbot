from typing import Any, Optional
from services.embedding.embedding_service import generate_products_embeddings
from app.dbhandlers.rag_pipeline_handler import store_embeddings
from schemas.models import ShopifyProduct

async def handle_product_embeddings_from_json(json_data: Any, namespace: Optional[str] = None) -> str:
    try:
        if not isinstance(json_data, list):
            raise ValueError("Invalid JSON format. Expected an array of products.")

        products = [ShopifyProduct(**item) for item in json_data]
        embeddings = await generate_products_embeddings(products)

        await store_embeddings(embeddings, namespace=namespace)
        return "LLM is trained with the data that you've provided. Thank you!"
    except Exception as error:
        print(f"Error processing JSON data: {error}")
        raise ValueError("Failed to process JSON data")
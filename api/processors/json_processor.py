from typing import Any
from services.embedding.embedding_service import generate_products_embeddings
from services.pinecone.pinecone_service import store_embeddings
from schemas.models import ShopifyProduct

async def validate_and_process_json(json_data: Any) -> str:
    try:
        if not isinstance(json_data, list):
            raise ValueError("Invalid JSON format. Expected an array of products.")

        products = [ShopifyProduct(**item) for item in json_data]
        embeddings = await generate_products_embeddings(products)

        await store_embeddings(embeddings)
        return "LLM is trained with the data that you've provided. Thank you!"
    except Exception as error:
        print(f"Error processing JSON data: {error}")
        raise ValueError("Failed to process JSON data")
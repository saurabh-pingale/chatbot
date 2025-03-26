from services.shopify.fetch_products import fetch_shopify_products
from services.embedding.embedding_service import generate_products_embeddings
from services.pinecone.pinecone_service import store_embeddings

async def process_products(shopify_store: str, shopify_access_token: str) -> None:
    try:
        products = await fetch_shopify_products(shopify_store, shopify_access_token)
        embeddings = await generate_products_embeddings(products)
        await store_embeddings(embeddings)
    except Exception as error:
        print(f"Error processing products: {error}")
        raise ValueError("Failed to process products")
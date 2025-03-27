import asyncio
from typing import List
from schemas.models import ShopifyProduct, ProductEmbedding
from .huggingface_embedding import generate_embeddings

async def generate_product_embedding(product: ShopifyProduct) -> ProductEmbedding:
    text = f"{product.title} {product.description} {product.price}"
    embedding = await generate_embeddings(text)
    
    return ProductEmbedding(
        id=product.id,
        values=embedding,
        metadata={
            "text": text,
            "title": product.title,
            "url": product.url,
            "image": product.image,
            "price": product.price
        }
    )

async def generate_products_embeddings(products: List[ShopifyProduct]) -> List[ProductEmbedding]:
    return await asyncio.gather(*[generate_product_embedding(product) for product in products])
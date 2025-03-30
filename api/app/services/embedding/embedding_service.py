import asyncio
from typing import List
from schemas.models import ShopifyProduct, ProductEmbedding
from ...external_service.generate_embeddings import generate_embeddings

async def generate_product_embedding(product: ShopifyProduct) -> ProductEmbedding:
    text = f"{product.title} {product.description} {product.price} {product.category}"
    embedding = await generate_embeddings(text)
    
    return ProductEmbedding(
        id=product.id,
        values=embedding,
        metadata={
            "text": text,
            "title": product.title,
            "description": product.description,
            "category": product.category,
            "url": product.url,
            "image": product.image,
            "price": product.price
        }
    )

async def generate_products_embeddings(products: List[ShopifyProduct]) -> List[ProductEmbedding]:
    return await asyncio.gather(*[generate_product_embedding(product) for product in products])
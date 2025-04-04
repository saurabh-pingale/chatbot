from fastapi import HTTPException
from typing import Dict, Any
from app.external_service.shopify_service import ShopifyService
from app.external_service.generate_embeddings import generate_embeddings
from app.dbhandlers.rag_pipeline_handler import RagPipelineHandler
from app.models.api.rag_pipeline import ProductEmbedding
from app.utils.logger import logger

class ShopifySyncService:
    def __init__(self, shopify_store: str, shopify_access_token: str):
        self.shopify_service = ShopifyService(shopify_store, shopify_access_token)
        self.rag_pipeline_handler = RagPipelineHandler()

    async def sync_products_to_vector_db(self, namespace: str) -> Dict[str, Any]:
        """Fetch products from Shopify, generate embeddings and store in vector DB"""
        try:
            shopify_data = await self.shopify_service.fetch_products_and_collections()
            products = shopify_data["products"]
            
            embeddings = []
            for product in products:
                embedding_text = f"Product: {product.title}. Description: {product.description}. Category: {product.category}. Price: {product.price}"
                
                embedding_values = await generate_embeddings(embedding_text)
                
                embeddings.append(ProductEmbedding(
                    id=product.id,
                    values=embedding_values,
                    metadata={
                        "title": product.title,
                        "description": product.description,
                        "category": product.category,
                        "price": product.price,
                        "url": product.url,
                        "image": product.image,
                        "variant_id": product.variant_id,
                        "type": "product"
                    }
                ))
            
            await self.rag_pipeline_handler.store_embeddings(embeddings, namespace)
            
            return {
                "status": "success",
                "message": "Products fetched and stored successfully",
                "product_count": len(products),
                "collection_count": len(shopify_data["collections"])
            }
            
        except Exception as error:
            logger.error(f"Error syncing products to vector DB: {error}")
            raise HTTPException(status_code=500, detail="Failed to sync products to vector DB")
from uuid import uuid4
from hashlib import sha256
from fastapi import HTTPException

from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.text_utils import split_text_with_overlap
from app.models.api.rag_pipeline import ProductEmbedding
from app.utils.logger import logger

class TextTrainingService:
    def __init__(self, shopify_store: str):
        self.shopify_store = shopify_store
        self.embeddings_handler = EmbeddingsHandler()

    async def train(self, text: str):
        try:
            chunks = split_text_with_overlap(text)
            chunks_embeddings = EmbeddingService.create_embeddings(chunks)

            wrapped_embeddings = []
            for chunk, embedding in zip(chunks, chunks_embeddings):
                wrapped_embeddings.append(
                    ProductEmbedding(
                        id=int(sha256(str(uuid4()).encode('utf-8')).hexdigest()[:8], 16), 
                        values=embedding, 
                        metadata={"text": chunk}
                    )
                )
                
            await self.embeddings_handler.store_embeddings(wrapped_embeddings, self.shopify_store)

            return {
                "status": "success",
                "message": "Text trained and stored successfully",
                "chunk_count": len(chunks)
            }

        except Exception as e:
            logger.error(f"Text training failed: {e}")
            raise HTTPException(status_code=500, detail="Text training failed")
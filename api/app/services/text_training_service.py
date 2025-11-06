from uuid import uuid4
from hashlib import sha256
from datetime import datetime, timedelta 
from fastapi import HTTPException

from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler

# TODO: Remove it when pricing flow is automated completely
from app.dbhandlers.shop_admin_handler import ShopAdminHandler
from app.dbhandlers.subscription_handler import SubscriptionHandler

from app.utils.text_utils import split_text_with_overlap

# TODO: Remove it when pricing flow is automated completely
from app.models.db.subscription import SubscriptionStatus

from app.models.api.rag_pipeline import ProductEmbedding
from app.utils.logger import logger

class TextTrainingService:
    def __init__(self, shopify_store: str):
        self.shopify_store = shopify_store
        self.embeddings_handler = EmbeddingsHandler()

        # TODO: Remove it when pricing flow is automated completely
        self.shop_admin_handler = ShopAdminHandler()
        self.subscription_handler = SubscriptionHandler()

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
                
            await self.embeddings_handler.create_embeddings(wrapped_embeddings, self.shopify_store)

            # TODO: Remove it when pricing flow is automated completely
            shop = await self.shop_admin_handler.get_shop_status(self.shopify_store)

            if not shop or not shop.setup_completed:
                start_date = datetime.utcnow();
                end_date = start_date + timedelta(days=90)

                await self.subscription_handler.create_subscription(
                    shop_id=self.shopify_store,
                    plan="Free",
                    stripe_subscription_id=f"free-trial-{self.shopify_store}-{int(start_date.timestamp())}",
                    stripe_customer_id=f"free-customer-{self.shopify_store}",
                    status=SubscriptionStatus.TRIALING,
                    start_date=start_date,
                    end_date=end_date
                )

                await self.shop_admin_handler.update_shop_setup_completed_status(self.shopify_store)

            return {
                "status": "success",
                "message": "Text trained and stored successfully",
                "chunk_count": len(chunks),
                "setupCompleted": True # TODO: Remove it when pricing flow is automated completely
            }

        except Exception as e:
            logger.error(f"Text training failed: {e}")
            raise HTTPException(status_code=500, detail="Text training failed")
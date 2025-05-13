from fastapi import APIRouter, Request, Header, HTTPException
from app.services.text_training_service import TextTrainingService
from app.utils.logger import logger

text_training_router = APIRouter(prefix="/text_training", tags=["text_training"])

@text_training_router.post("/train")
async def train_with_text(
    request: Request,
    x_shopify_store: str = Header(..., alias="X-Shopify-Store")
):
    """
    Accepts raw text from training UI, splits into chunks, embeds, stores in Vector DB
    """
    try:
        if not x_shopify_store:
            raise HTTPException(
                status_code=400,
                detail="X-Shopify-Store headers are required"
            )
        
        text_training_service = TextTrainingService(
            shopify_store=x_shopify_store
        )

        body = await request.json()
        text = body.get("text")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")

        result = await text_training_service.train(text)
        return result

    except Exception as e:
        logger.error(f"Training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to train with text")
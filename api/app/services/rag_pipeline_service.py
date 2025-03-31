from fastapi import HTTPException
from typing import List, Dict, Any

from app.utils.prompt import create_prompt
from app.models.api.rag_pipeline import LLMResponse
from app.dbhandlers.rag_pipeline_handler import RagPipelineHandler
from app.external_service.langfuse_tracker import track_llm_interaction
from app.external_service.generate_embeddings import generate_embeddings
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.utils.rag_pipeline_utils import (
    clean_response_from_llm,
    extract_products_from_response,
    extract_user_message_from_prompt,
    format_context_texts,
    filter_products_for_display,
    is_product_query,
)


class RagPipelineService:
    def __init__(self):
        self.rag_handler = RagPipelineHandler()

    async def conversation(self, namespace: str, contents: str) -> Dict[str, Any]:
        """Handles conversation flow by generating embeddings, querying vector db, and fetching LLM response."""
        try:
            if not contents:
                raise HTTPException(
                    status_code=400, detail="Messages are required for chat requests"
                )

            user_message_embeddings = await generate_embeddings(contents)
            query_response = await self.rag_handler.query_embeddings(
                user_message_embeddings, namespace=namespace
            )

            products = extract_products_from_response(query_response)
            context_texts = format_context_texts(query_response)

            full_prompt = create_prompt(contents, context_texts)
            llm_response = await self.generate_llm_response(full_prompt, products)

            return {
                "answer": llm_response.response,
                "products": llm_response.products or [],
                "categories": llm_response.categories or [],
            }

        except HTTPException:
            raise
        except Exception as error:
            print(f"Error processing request: {error}")
            raise HTTPException(
                status_code=500, detail="Failed to process your request"
            )

    async def generate_llm_response(
        self,
        prompt: str, products: List[Dict] = []
    ) -> LLMResponse:
        user_message = extract_user_message_from_prompt(prompt)

        response = await generate_text_from_huggingface(prompt)

        cleaned_response = clean_response_from_llm(response)

        track_llm_interaction(prompt, cleaned_response, user_message)

        if is_product_query(user_message, products):
            transformed_products = filter_products_for_display(products, user_message)
            return LLMResponse(response=cleaned_response, products=transformed_products)
        else:
            return LLMResponse(response=cleaned_response, products=[])

import re
from fastapi import HTTPException
from typing import List, Dict, Any

from app.utils.prompt import create_prompt
from services.embedding.embedding_service import generate_embeddings
from app.dbhandlers.rag_pipeline_handler import query_embeddings
from app.services.LLM_service import generate_llm_response
from app.models.api.rag_pipeline import LLMResponse
from app.external_service.hugging_face_api import generate_text_from_huggingface
from app.external_service.langfuse_tracker import track_llm_response
from app.utils.rag_pipeline_utils import (clean_response_from_llm, extract_products_from_response,
    extract_user_message_from_prompt, format_context_texts, get_transformed_products, is_product_query)

class RagPipelineService:

    async def conversation(self, namespace: str, contents: str) -> Dict[str, Any]:
        """Handles conversation flow by generating embeddings, querying vector db, and fetching LLM response."""
        try:
            user_message_embeddings = await generate_embeddings(contents)
            query_response = await query_embeddings(
                user_message_embeddings, namespace=namespace
            )

            products = extract_products_from_response(query_response)
            context_texts = format_context_texts(query_response)

            full_prompt = create_prompt(contents, context_texts)
            llm_response = await generate_llm_response(full_prompt, products)

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
        prompt: str, products: List[Dict] = []
    ) -> LLMResponse:
        user_message = extract_user_message_from_prompt(prompt)

        response = await generate_text_from_huggingface(prompt)

        cleaned_response = clean_response_from_llm(response)

        track_llm_response(prompt, cleaned_response, user_message)

        if is_product_query(user_message, products):
            transformed_products = get_transformed_products(products, user_message)
            return LLMResponse(response=cleaned_response, products=transformed_products)
        else:
            return LLMResponse(response=cleaned_response, products=[])

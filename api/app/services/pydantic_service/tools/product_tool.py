import random
from .base_tool import BaseTool
from pydantic_ai import RunContext
from pydantic_ai.exceptions import ModelRetry
from typing import Dict, Any

from app.services.embeddings_service import EmbeddingService
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.rag_pipeline_utils import (
    extract_products_from_response,
    extract_categories
)

class ProductTool(BaseTool):
    """Help users search for or learn about products"""
    @property
    def tool_name(self) -> str:
        return "product"
    
    def __init__(self, test_mode=False, failure_rate=0.5):
        self.test_mode = test_mode
        self.failure_rate = failure_rate

    def _should_simulate_failure(self) -> bool:
        """Simulate random failures in test mode"""
        if not self.test_mode:
            return False
        return random.random() < self.failure_rate
    
    async def run(self, ctx: RunContext[None], user_message: str) -> Dict[str, Any]:
        if self._should_simulate_failure():
            print("TEST MODE: Simulating product tool failure")
            raise ModelRetry("Simulated failure for testing - retrying...")

        try:
            embedding = EmbeddingService.create_embeddings(user_message)
            results = await EmbeddingsHandler.query_embeddings(
                vector=embedding, 
                namespace="test-chatbot201.myshopify.com", 
                agent_type="ProductAgent"
            )
            products = extract_products_from_response(results)
            categories = extract_categories(products)
            
            if not isinstance(products, list):
                raise ModelRetry("Invalid product data format, retrying...")
            
            return {
                "products": products,
                "categories": categories
            }
        except Exception as e:
            print(f"Error in product tool: {e}")
            raise ModelRetry(f"Failed to fetch products: {str(e)}, retrying...")
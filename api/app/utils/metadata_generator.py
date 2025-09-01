import json
from typing import Dict, List

from app.external_service.llm_service import LLMService
from app.utils.metadata_cache import MetadataCache
from app.utils.logger import logger

class MetadataGenerator:
    """Generate metadata config using an LLM and store it in Redis."""

    def __init__(self):
        self.llm_service = LLMService()
        self.cache_handler = MetadataCache()

    def _build_prompt(self, sample_products_by_category: List[Dict], collections: List[Dict]) -> str:
        """Constructs a detailed prompt for the LLM."""
        
        product_samples_with_metafields = []
        for category, product in sample_products_by_category.items():
            metafields = getattr(product, 'metafields', {})
            product_samples_with_metafields.append({
                "category": category,
                "product_title": getattr(product, 'title', 'N/A'),
                "attributes": list(metafields.keys())
            })

        collection_titles = [f"- {c.title or ''}" for c in collections]

        prompt = f"""
        You are an expert Shopify data analyst. Your task is to generate three JSON objects for filtering products based on samples from an e-commerce store: CATEGORY_ALIASES, CATEGORY_ATTRIBUTES, and ATTRIBUTE_PATTERNS.

        Here are the available collection (category) names:
        {json.dumps(collection_titles, indent=2)}

        Here are sample products from some of these categories, including their available filterable attributes (metafields):
        {json.dumps(product_samples_with_metafields, indent=2)}

        **Your Instructions:**

        1.  **CATEGORY_ALIASES**: Create a JSON object that maps common search terms and synonyms (e.g., "tee", "tshirt", "shirt") to a single, canonical category name from the list provided (e.g., "t-shirts"). Be comprehensive. If a singular form is provided (e.g., "hat"), create an alias for the plural ("hats").
        
        2.  **CATEGORY_ATTRIBUTES**: Create a JSON object where each key is a canonical category name. The value for each key must be a list of the **exact attribute names** you see in the product samples for that category. Also include common, universal attributes like "price" and "size" if they are not present.
            - Example: If the 't-shirts' sample has attributes ["color", "fabric"], the output should be `{{"t-shirts": ["price", "size", "color", "fabric"]}}`.
        
        3.  **ATTRIBUTE_PATTERNS**: Create a JSON object where keys are the attribute names found in the samples (e.g., "color", "size", "fabric"). The values must be Python-compatible regex patterns formatted as valid JSON strings.
            - **CRITICAL**: All backslashes in the regex must be escaped. For example, a word boundary `\b` becomes `\\b`, a literal period `\.` becomes `\\.`, and a literal dollar sign `\$` becomes `\\$`. A correct example is: `"\\\\b(red|blue)\\\\b"`.
            - Include patterns for all attributes you listed in CATEGORY_ATTRIBUTES. Be thorough with common values (e.g., include many colors, sizes, fabric types). For price, provide patterns for exact, range, under, and over queries.

        **Output Format:**
        Return ONLY the raw JSON object containing these three top-level keys. Do not add any explanatory text before or after the JSON.
        """
        return prompt

    async def generate_and_store_config(self, namespace: str, sample_products_by_category: List[Dict], collections: List[Dict]):
        """Generates config via LLM and saves it to Redis."""
        try:
            if not sample_products_by_category and not collections:
                logger.warning("No product samples or collections provided to generate metadata config. Skipping.")
                return
            
            prompt = self._build_prompt(sample_products_by_category, collections)
            generated_config = await self.llm_service.generate_json(prompt)

            if not isinstance(generated_config, dict):
                logger.warning("LLM did not return a valid dictionary. Skipping Redis update.")
                return
            
            await self.cache_handler.store_config(namespace, generated_config)

        except Exception as e:
            logger.error(f"Failed to generate or store LLM-based metadata config: {e}", exc_info=True)
from app.models.api.response import ProductResponse, OrderResponse, Product, GreetingResponse, TermsResponse
from typing import Union
from app.utils.rag_pipeline_utils import extract_categories
from app.utils.logger import logger

class Processing:
    """Handles tool output processing for LLMService"""
    
    def process_product_output(self, response: ProductResponse, output: dict):
        """Special processing for product tool output"""
        processed_products = []
        if output.get("products") and isinstance(output["products"], list):
            for product_item in output["products"]:
                if not isinstance(product_item, dict):
                    logger.warning(f"Skipping non-dict product data: {product_item}")
                    continue
                try:
                    product_id = str(product_item.get("id"))
                    product_name = product_item.get("name") or product_item.get("title")
                    product_price_str = product_item.get("price")
                    product_price = float(product_price_str) if product_price_str is not None else 0.0
                    product_category = product_item.get("category")
                    product_description = product_item.get("description")
                    product_image_url = product_item.get("image_url") or product_item.get("image")
                    product_variant_id = product_item.get("variant_id")

                    if not all([product_id, product_name, product_category]):
                        logger.warning(f"Skipping product with missing essential fields: {product_item}")
                        continue

                    processed_products.append(Product(
                        id=product_id,
                        name=product_name,
                        price=product_price,
                        category=product_category,
                        description=product_description,
                        image_url=product_image_url,
                        variant_id=product_variant_id 
                    ))
                except Exception as e:
                    logger.error(f"Error processing product data: {product_item}. Error: {e}")

        if processed_products:
            response.products = processed_products
            response.id = [p.id for p in processed_products]
        else:
            response.products = []
            response.id = []
            
        if output.get("categories"):
            response.categories = output["categories"]
        elif processed_products:
            response.categories = extract_categories([p.model_dump() for p in processed_products])
        else:
            response.categories = []

    def process_order_output(self, response: OrderResponse, output: dict):
        """Special processing for order tool output"""
        if output.get("email"):
            response.email = output["email"]
        if output.get("phone"):
            response.phone = output["phone"]

    def process_response(self, response: Union[OrderResponse, GreetingResponse, TermsResponse]) -> dict:
        """General processor for supported non-product responses"""
        if isinstance(response, OrderResponse):
            return {
                "answer": response.response_text,
                "email": response.email,
                "phone": response.phone,
                "requires_support": response.requires_support,
                "success": True
            }
        elif isinstance(response, GreetingResponse):
            return {
                "answer": response.welcome_message,
                "categories": [],
                "success": True
            }
        elif isinstance(response, TermsResponse):
            return {
                "answer": response.response,
                "sources": response.sources,
                "success": True
            }
        else:
            logger.warning("Unhandled response type in process_response")
            return {
                "answer": "Sorry, I wasn't able to process that.",
                "success": False
            }
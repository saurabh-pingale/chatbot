from app.models.api.response import ProductResponse, Product, GeneralResponse, OrderResponse
from typing import Union
from app.utils.rag_pipeline_utils import extract_categories
from app.utils.logger import logger

class Processing:
    """Handles tool output processing for LLMService"""
    
    def process_product_output(self, response: ProductResponse, output: dict):
        """Special processing for product tool output"""
        logger.info(f"Product Response: {response}")
        logger.info(f"Product Output: {output}")

        if output.get("not_found", False):
            logger.info("No products found, setting empty products list")
            response.products = []
            response.product_ids = []
            response.not_found = True
            
            if output.get("categories"):
                response.available_categories = output["categories"]
                response.categories = output["categories"]
            else:
                response.available_categories = []
                response.categories = []

            if response.available_categories:
                categories_text = ", ".join(response.available_categories[:5])  # Limit to 5 categories
                response.answer = f"Couldn't find that exact item, but here are some popular options available: {categories_text}"
            else:
                response.answer = "Couldn't find that item right now, but I'd be happy to help you find something else!"
            
            return
        
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
            response.not_found = False
        else:
            response.products = []
            response.id = []
            response.not_found = True
            
        if output.get("categories"):
            response.categories = output["categories"]
        elif processed_products:
            response.categories = extract_categories([p.model_dump() for p in processed_products])
        else:
            response.categories = []

        if output.get("categories") and not processed_products:
            response.available_categories = output["categories"]

    # def process_order_output(self, response: OrderResponse, output: dict):
    #     """Special processing for order tool output"""
    #     logger.info(f"Order Response: {response}")
    #     if output.get("email"):
    #         response.email = output["email"]
    #     if output.get("phone"):
    #         response.phone = output["phone"]

    def process_response(self, response: Union[GeneralResponse]) -> dict:
        """General processor for supported non-product responses"""
        if isinstance(response, OrderResponse):
            logger.info(f"General Order Response: {response}")
            return {
                "answer": response.answer,
                "email": response.email,
                "phone": response.phone,
                "success": response.success
            }
        elif isinstance(response, GeneralResponse):
            logger.info(f"General Response: {response}")
            return {
                "answer": response.answer,
                "success": response.success
            }
        else:
            logger.warning("Unhandled response type in process_response")
            return {
                "answer": "Sorry, I wasn't able to process that.",
                "success": False
            }
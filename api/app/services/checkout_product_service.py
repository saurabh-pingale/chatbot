from app.dbhandlers.checkout_product_handler import CheckoutProductHandler

class CheckoutProductService:
    def __init__(self):
        self.db_handler = CheckoutProductHandler()

    async def store_checkout_product(self, store_name: str, user_email: str, product_name: str, collection_title: str, product_count: int):
        """Store checkout product data via handler."""
        return await self.db_handler.store_checkout_product(
            store_name, user_email, product_name, collection_title, product_count
        )

    async def remove_checkout_product(self, product_title: str):
        """Remove checkout product via handler."""
        return await self.db_handler.remove_checkout_product(product_title)
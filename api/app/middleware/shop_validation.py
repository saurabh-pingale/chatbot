from fastapi import Request, HTTPException
from starlette.types import ASGIApp, Receive, Scope, Send

from app.dbhandlers.db import AsyncSessionLocal
from app.dbhandlers.shop_config_handler import ShopConfigHandler
from app.utils.logger import logger

class ShopValidation:
    def __init__(self, app: ASGIApp):
        self.app = app
        self.shop_config_handler = ShopConfigHandler()

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request = Request(scope, receive)

        shop_id = None
        headers_to_check = ['x-shopify-store', 'X-Shopify-Store', 'shop_id', 'Shop-Id']

        for key in headers_to_check:
            shop_id = request.headers.get(key)
            if shop_id:
                break

        if not shop_id:
            shop_id = request.query_params.get("shop_id") or request.query_params.get("shopId")

        if not shop_id and request.headers.get("content-type", "").startswith("application/json"):
            try:
                body = await request.json()
                request.state.json_body = body
                shop_id = body.get("shop_id") or body.get("shopId")
            except Exception as e:
                logger.debug(f"Could not parse body for shop_id: {e}")

        if not shop_id:
            await self.app(scope, receive, send)
            return

        path = scope.get("path")
        if path == "/shop-admin/shop-status":
            # Skip validation for shop-status
            request.state.shop_id = shop_id
        else:
            async with AsyncSessionLocal() as session:
                try:
                    shop_pk = await self.shop_config_handler.get_shop_pk(shop_id, session)
                    if not shop_pk:
                        logger.warning(f"Shop not found for shop_id: {shop_id}")
                        raise HTTPException(status_code=404, detail="Shop not found.")
                    request.state.shop_id = shop_id
                    request.state.shop_pk = shop_pk
                except HTTPException:
                    raise
                except Exception as e:
                    logger.error(f"Error validating shop {shop_id}: {e}", exc_info=True)
                    raise HTTPException(status_code=500, detail="Internal server error during shop validation.")

        await self.app(scope, receive, send)

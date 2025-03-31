from typing import List
from fastapi import APIRouter, Request, HTTPException

from app.services.store_admin_service import get_color_preference_db
from app.models.api.store_admin import (
    CollectionRequest,
    CollectionResponse,
    ColorPreferenceResponse,
    ErrorResponse,
    StoreProductsRequest,
    StoreProductsResponse,
)
from app import app

store_admin_router = APIRouter(prefix="/store-admin", tags=["store", "admin"])

@store_admin_router.get(
    "/color-preference",
    summary="Color preference for shopify store admin",
    response_model=ColorPreferenceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_color_preference(
    request: Request,
):
    shopId = request.shop.shop_domain
    try:
        color = await get_color_preference_db(shopId)
        return {"color": color}
    except Exception as error:
        print(f"Error in get_color_preference: {error}")
        raise HTTPException(status_code=500, detail="Failed to fetch color preference")


@store_admin_router.post("/store-collections", response_model=CollectionResponse)
async def store_collections(collections: List[CollectionRequest]):
    """Stores Shopify collections in the database."""
    try:
        stored_collections = await app.store_admin_service.store_collections(collections)
        return CollectionResponse(
            message="Collections stored successfully", data=stored_collections
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to store collections")


@store_admin_router.post("/store-products", response_model=StoreProductsResponse)
async def store_products(request: StoreProductsRequest):
    """Stores Shopify products in the database and links them to collections."""
    try:
        await shopify_service.store_products(
            request.products, request.collection_id_map
        )
        return StoreProductsResponse(message="Products stored successfully")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to store products")

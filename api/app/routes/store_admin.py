from typing import List
from fastapi import APIRouter, Request, HTTPException, Depends
from app.services.store_admin_service import StoreAdminService
from app.models.api.store_admin import (
    CollectionRequest,
    CollectionResponse,
    ColorPreferenceResponse,
    ErrorResponse,
    StoreProductsRequest,
    StoreProductsResponse,
)

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
    store_service: StoreAdminService = Depends(lambda: request.app.store_admin_service)
):
    shopId = request.shop.shop_domain
    try:
        color = await store_service.get_color_preference_db(shopId)
        return {"color": color}
    except Exception as error:
        print(f"Error in get_color_preference: {error}")
        raise HTTPException(status_code=500, detail="Failed to fetch color preference")


@store_admin_router.post(
    "/collections",
    response_model=CollectionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def collections(collections: List[CollectionRequest]):
    """Stores Shopify collections in the database."""
    try:
        stored_collections = await store_service.store_collections(
            collections
        )
        return CollectionResponse(
            message="Collections stored successfully", data=stored_collections
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to store collections")


@store_admin_router.post(
    "/products",
    response_model=StoreProductsResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def products(
    request: StoreProductsRequest,
    store_service: StoreAdminService = Depends(lambda: request.app.store_admin_service)
):
    """Stores Shopify products in the database and links them to collections."""
    try:
        await store_service.store_products(
            request.products, request.collection_id_map
        )
        return StoreProductsResponse(message="Products stored successfully")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to store products")

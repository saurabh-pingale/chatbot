from typing import List, Dict
from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.models.api.store_admin import (
    CollectionRequest,
    CollectionResponse,
    ColorPreferenceResponse,
    ErrorResponse,
    StoreProductsRequest,
    StoreProductsResponse,
)
from app.utils.logger import logger

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
async def get_color_preference(request: Request):
    # shopId = request.shop.shop_domain
    shopId = request.query_params.get("shopId")
    try:
        app = get_app()
        color = await app.store_admin_service.get_color_preference(shopId)
        return {"color": color}
    except Exception as error:
        logger.error("Error in get_color_preference: %s", str(error), exc_info=True)
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
        app = get_app()
        stored_collections = await app.store_admin_service.store_collections(collections)
        return CollectionResponse(
            message="Collections stored successfully", data=stored_collections
        )
    except Exception as error:
        logger.error("Error in collections endpoint: %s", str(error), exc_info=True)
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
async def products(request: StoreProductsRequest):
    """Stores Shopify products in the database and links them to collections."""
    try:
        app = get_app()
        await app.store_admin_service.store_products(request.products, request.collection_id_map)
        return StoreProductsResponse(message="Products stored successfully")
    except Exception as error:
        logger.error("Error in products endpoint: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to store products")

@store_admin_router.post(
    "/chatbot-session",
    summary="Store chatbot session analytics",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def store_chatbot_session(request: Request, session_data: Dict):
    """Endpoint to store chatbot session analytics"""
    try:
        app = get_app()
        shop_id = request.query_params.get("shopId")
        session_data['store_id'] = shop_id
        success = await app.analytics_service.store_session_analytics(session_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store analytics")
        return {"message": "Analytics stored successfully"}
    except Exception as error:
        logger.error("Error in store_chatbot_session: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process analytics")

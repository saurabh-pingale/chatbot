from fastapi import APIRouter, Request, HTTPException

from app.utils.app_utils import get_app
from app.models.api.store_admin import (
    ColorPreferenceResponse,
    ErrorResponse,
    ColorPreferenceRequest,
    SupportInfoRequest,
    StoreImageResponse,
    StoreImageRequest,
    GetImageResponse
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
    shop_id = request.query_params.get("shopId")
    try:
        app = get_app()
        color = await app.store_admin_service.get_color_preference(shop_id)
        return {"color": color}
    except Exception as error:
        logger.error("Error in get_color_preference: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch color preference")

@store_admin_router.post(
    "/save-color-preference",
    summary="Save color preference for shopify store admin",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def save_color_preference(request: Request, body: ColorPreferenceRequest):
    shop_id = request.query_params.get("shopId")
    color = body.color
    if not shop_id or not color:
        raise HTTPException(status_code=400, detail="Missing shopId or color")

    try:
        app = get_app()
        await app.store_admin_service.save_color_preference(shop_id, color)
        return {"success": True}
    except Exception as error:
        logger.error("Error in save_color_preference: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save color preference")

@store_admin_router.post(
    "/save-support-info",
    summary="Save support info for shopify store admin",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    }
)
async def save_support_info(request: Request, body: SupportInfoRequest):
    shop_id = request.query_params.get("shopId")
    email = body.supportEmail
    phone = body.supportPhone

    if not shop_id or not email or not phone:
        raise HTTPException(status_code=400, detail="Missing shopId or email or phone")

    try:
        app = get_app()
        await app.store_admin_service.save_support_info(shop_id, email, phone)
        return {"success": True}
    except Exception as error:
        logger.error("Error in save_support_info: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save support info")

@store_admin_router.post(
    "/save-store-image",
    summary="Save store image URL",
    response_model=StoreImageResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def save_store_image(request: Request, body: StoreImageRequest):
    shop_id = request.query_params.get("shopId")
    image_url = body.imageUrl

    if not shop_id or not image_url:    
        raise HTTPException(status_code=400, detail="Missing shopId or image")
    try:
        app = get_app()
        await app.store_admin_service.save_store_image(shop_id, image_url)
        return {"success": True}
    except Exception as error:
        logger.error("Error in save_store_image: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save store image")

@store_admin_router.get(
    "/get-image",
    summary="Image for shopify store admin",
    response_model=GetImageResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_image(request: Request):
    shop_id = request.query_params.get("shopId")
    try:
        app = get_app()
        image = await app.store_admin_service.get_image(shop_id)
        return {"image": image}
    except Exception as error:
        logger.error("Error in get_image: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch image")
from fastapi import APIRouter, Request, HTTPException
import re

from app.utils.app_utils import get_app
from app.models.api.shop_admin import (
    ErrorResponse,
    ColorPreferenceRequest,
    SupportInfoRequest,
    ShopImageResponse,
    ShopImageRequest,
    ShopStatusResponse,
    EmailGatePreferenceRequest,
    IntegrationRequest,
    IntegrationResponse
)
from app.utils.logger import logger

shop_admin_router = APIRouter(prefix="/shop-admin", tags=["shop", "admin"])

def _get_cleaned_shop_id(request: Request) -> str:
    """Extracts and cleans the shopId from query parameters."""
    shop_id = request.query_params.get("shopId")
    if not shop_id:
        raise HTTPException(status_code=400, detail="shopId query parameter is required.")
    return shop_id.split('?')[0]

@shop_admin_router.post(
    "/save-color-preference",
    summary="Save color preference for shopify shop admin",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_color_preference(request: Request, body: ColorPreferenceRequest):
    shop_id = _get_cleaned_shop_id(request)
    color = body.color
    if not color:
        raise HTTPException(status_code=400, detail="Missing color")

    try:
        app = get_app()
        await app.shop_admin_service.create_color_preference(shop_id, color)
        return {"success": True}
    except Exception as error:
        logger.error("Error in create_color_preference: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create color preference")

@shop_admin_router.post(
    "/save-support-info",
    summary="Save support info for shopify shop admin",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    }
)
async def create_support_info(request: Request, body: SupportInfoRequest):
    shop_id = _get_cleaned_shop_id(request)
    email = body.supportEmail
    phone = body.supportPhone
    country_code = body.countryCode

    if not email or not phone:
        raise HTTPException(status_code=400, detail="Missing email or phone")
    
    if not re.fullmatch(r"[\d\s+-]+", phone) or not re.fullmatch(r"[\d]+", re.sub(r"[^\d]", "", phone)):
        raise HTTPException(status_code=400, detail="Phone number should contain only digits, spaces, or hyphens")

    try:
        app = get_app()
        await app.shop_admin_service.create_support_info(shop_id, email, phone, country_code)
        return {"success": True}
    except Exception as error:
        logger.error("Error in create_support_info: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create support info")

@shop_admin_router.post(
    "/save-shop-image",
    summary="Save shop image URL",
    response_model=ShopImageResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_shop_image(request: Request, body: ShopImageRequest):
    shop_id = _get_cleaned_shop_id(request)
    image_url = body.imageUrl

    if not image_url:    
        raise HTTPException(status_code=400, detail="Missing image")
    try:
        app = get_app()
        await app.shop_admin_service.create_shop_image(shop_id, image_url)
        return {"success": True}
    except Exception as error:
        logger.error("Error in create_shop_image: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create shop image")

@shop_admin_router.get(
    "/shop-status",
    summary="Get the setup status and plan for the shop",
    response_model=ShopStatusResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Shop not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_shop_status(request: Request):
    shop_domain = _get_cleaned_shop_id(request)
    
    try:
        app = get_app()
        shop, subscription = await app.shop_admin_service.get_shop_status_with_subscription(shop_domain)
        
        if not shop:
            return {
                "setup_completed": False,
                "plan": "Not Selected",
                "subscription_status": None,
                "end_date": None,
            }
        
        if subscription:
            return {
                "plan": subscription.plan,
                "setup_completed": shop.setup_completed,
                "subscription_status": subscription.status.value if subscription.status else None,
                "end_date": subscription.end_date.isoformat() if subscription.end_date else None,
            }
        else:
            return {
                "plan": shop.plan or "Not Selected",
                "setup_completed": shop.setup_completed,
                "subscription_status": "trial",
                "end_date": shop.plan_end_date.isoformat() if shop.plan_end_date else None,
            }
    except Exception as error:
        logger.error(f"Error in get_shop_status for shop {shop_domain}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch shop status.")

@shop_admin_router.post(
    "/save-email-gate-preference",
    summary="Save Email Gate preference for the shop",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request (e.g., missing shopId or preference)"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_email_gate_preference(request: Request, body: EmailGatePreferenceRequest):
    shop_id = _get_cleaned_shop_id(request)

    try:
        app = get_app()
        await app.shop_admin_service.create_email_gate_preference(shop_id, body.show_email_gate)
        return {"success": True, "message": "Email Gate preference created successfully."}
    except Exception as error:
        logger.error(f"Error in create_email_gate_preference_route for shop {shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create Email Gate preference.")
    

@shop_admin_router.post(
    "/integration",
    summary="Save integration details",
    response_model=IntegrationResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_integration(request: Request, body: IntegrationRequest):
    shop_id = _get_cleaned_shop_id(request)
    
    if not body.title or not body.description:
        raise HTTPException(status_code=400, detail="Title and description are required")
    
    try:
        app = get_app()
        await app.shop_admin_service.create_integration(shop_id, body.title, body.description)
        return {"success": True, "message": "Integration saved successfully"}
    except Exception as error:
        logger.error(f"Error in save_integration for shop {shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save integration")
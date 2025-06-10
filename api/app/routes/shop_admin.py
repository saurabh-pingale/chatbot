from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timedelta, UTC

from app.utils.app_utils import get_app
from app.models.api.shop_admin import (
    ColorPreferenceResponse,
    ErrorResponse,
    ColorPreferenceRequest,
    SupportInfoRequest,
    ShopImageResponse,
    ShopImageRequest,
    GetImageResponse,
    PlanDetailsRequest,
    ShopStatusResponse,
    EmailGatePreferenceRequest,
    EmailGatePreferenceResponse
)
from app.utils.logger import logger

shop_admin_router = APIRouter(prefix="/shop-admin", tags=["shop", "admin"])

def _get_cleaned_shop_id(request: Request) -> str:
    """Extracts and cleans the shopId from query parameters."""
    shop_id = request.query_params.get("shopId")
    if not shop_id:
        raise HTTPException(status_code=400, detail="shopId query parameter is required.")
    return shop_id.split('?')[0]

@shop_admin_router.get(
    "/color-preference",
    summary="Color preference for shopify shop admin",
    response_model=ColorPreferenceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_color_preference(request: Request):
    shop_id = _get_cleaned_shop_id(request)
    try:
        app = get_app()
        color = await app.shop_admin_service.get_color_preference(shop_id)
        return {"color": color}
    except Exception as error:
        logger.error("Error in get_color_preference: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch color preference")

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
async def save_color_preference(request: Request, body: ColorPreferenceRequest):
    shop_id = _get_cleaned_shop_id(request)
    color = body.color
    if not color:
        raise HTTPException(status_code=400, detail="Missing color")

    try:
        app = get_app()
        await app.shop_admin_service.save_color_preference(shop_id, color)
        return {"success": True}
    except Exception as error:
        logger.error("Error in save_color_preference: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save color preference")

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
async def save_support_info(request: Request, body: SupportInfoRequest):
    shop_id = _get_cleaned_shop_id(request)
    email = body.supportEmail
    phone = body.supportPhone

    if not email or not phone:
        raise HTTPException(status_code=400, detail="Missing email or phone")

    try:
        app = get_app()
        await app.shop_admin_service.save_support_info(shop_id, email, phone)
        return {"success": True}
    except Exception as error:
        logger.error("Error in save_support_info: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save support info")

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
async def save_shop_image(request: Request, body: ShopImageRequest):
    shop_id = _get_cleaned_shop_id(request)
    image_url = body.imageUrl

    if not image_url:    
        raise HTTPException(status_code=400, detail="Missing image")
    try:
        app = get_app()
        await app.shop_admin_service.save_shop_image(shop_id, image_url)
        return {"success": True}
    except Exception as error:
        logger.error("Error in save_shop_image: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save shop image")

@shop_admin_router.get(
    "/get-image",
    summary="Image for shopify shop admin",
    response_model=GetImageResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        401: {"model": ErrorResponse, "description": "Unauthorized access"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_image(request: Request):
    shop_id = _get_cleaned_shop_id(request)
    try:
        app = get_app()
        image = await app.shop_admin_service.get_image(shop_id)
        return {"image": image}
    except Exception as error:
        logger.error("Error in get_image: %s", str(error), exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch image")

@shop_admin_router.post(
    "/save-plan-details",
    summary="Save plan details and owner information for the shop",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def save_plan_details(request: Request, body: PlanDetailsRequest):
    shop_id = _get_cleaned_shop_id(request)

    try:
        app = get_app()
        
        plan_start_date = datetime.now(UTC)
        plan_end_date = plan_start_date + timedelta(days=30) if body.plan == "free" else None

        await app.shop_admin_service.save_plan_details(
            shop_id=shop_id,
            owner_name=body.owner_name,
            owner_email=body.owner_email,
            owner_location=body.owner_location,
            plan=body.plan,
            plan_start_date=plan_start_date,
            plan_end_date=plan_end_date,
            setup_completed=True 
        )
        return {"success": True, "message": "Plan details saved successfully."}
    except Exception as error:
        logger.error(f"Error in save_plan_details for shop {shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save plan details.")

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
    shop_id = _get_cleaned_shop_id(request)
    
    try:
        app = get_app()
        
        status = await app.shop_admin_service.get_shop_status(shop_id)
        return status
    except HTTPException as http_exc:
        raise http_exc
    except Exception as error:
        logger.error(f"Error in get_shop_status for shop {shop_id}: {error}", exc_info=True)
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
async def save_email_gate_preference(request: Request, body: EmailGatePreferenceRequest):
    shop_id = _get_cleaned_shop_id(request)

    try:
        app = get_app()
        await app.shop_admin_service.save_email_gate_preference(shop_id, body.show_email_gate)
        return {"success": True, "message": "Email Gate preference saved successfully."}
    except Exception as error:
        logger.error(f"Error in save_email_gate_preference_route for shop {shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save Email Gate preference.")

@shop_admin_router.get(
    "/email-gate-preference",
    summary="Get Email Gate preference for the shop",
    response_model=EmailGatePreferenceResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request (e.g., missing shopId)"},
        404: {"model": ErrorResponse, "description": "Shop not found or preference not set (though service provides default)"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_email_gate_preference(request: Request):
    shop_id = _get_cleaned_shop_id(request)

    try:
        app = get_app()
        preference = await app.shop_admin_service.get_email_gate_preference(shop_id)
        return EmailGatePreferenceResponse(show_email_gate=preference, shop_id=shop_id)
    except Exception as error:
        logger.error(f"Error in get_email_gate_preference_route for shop {shop_id}: {error}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch Email Gate preference.")
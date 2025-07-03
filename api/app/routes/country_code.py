from fastapi import APIRouter, HTTPException
from typing import List

from app.utils.app_utils import get_app
from app.models.api.country_code import CountryCodeResponse, CountryCodeCreateRequest

country_code_router = APIRouter(prefix="/country_code", tags=["country_code"])

@country_code_router.get("", response_model=List[CountryCodeResponse])
async def get_country_codes():
    """ Get all country codes """
    app = get_app()
    return await app.country_code_service.get_country_codes()

@country_code_router.post("")
async def store_country_codes(request: CountryCodeCreateRequest):
    """ Store country codes """
    try:
        app = get_app()
        await app.country_code_service.store_country_codes(request.country_codes)
        return {"success": True, "message": "Country codes stored successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@country_code_router.get("/country/status")
def config_status():
    """
    Returns a static status response to confirm the service is up.
    """
    return {"status": "success"}
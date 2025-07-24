from typing import Optional
from app.models.db.shop_admin import UserModel

def update_user_location_if_missing(
    user: UserModel,
    country: Optional[str] = None,
    region: Optional[str] = None,
    city: Optional[str] = None,
    ip_address: Optional[str] = None
) -> bool:
    """
    Updates user location fields only if they are not already set.
    Returns True if any field was updated, else False.
    """
    updated = False

    if country and not user.country:
        user.country = country
        updated = True
    if region and not user.region:
        user.region = region
        updated = True
    if city and not user.city:
        user.city = city
        updated = True
    if ip_address and not user.ip_address:
        user.ip_address = ip_address
        updated = True

    return updated

def validate_string(value):
            return value if isinstance(value, str) and value.strip() else None
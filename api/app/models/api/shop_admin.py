from fastapi import HTTPException
from pydantic import BaseModel, Field, EmailStr, model_validator 
from typing import List, Optional, Dict, Any

class UTMParameters(BaseModel):
    """Defines the structure for UTM parameters."""
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None

class ErrorResponse(BaseModel):
    message: str
    success: bool

class ColorPreferenceResponse(BaseModel):
    color: Optional[str]

class CollectionRequest(BaseModel):
    title: str
    products_count: int

class CollectionResponse(BaseModel):
    message: str
    data: List[CollectionRequest]

class ProductRequest(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    url: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None

class StoreProductsRequest(BaseModel):
    products: List[ProductRequest]
    collection_id_map: Dict[str, int]

class StoreProductsResponse(BaseModel):
    message: str

class Collection(BaseModel):
    id: str
    title: str
    products_count: int

    class Config:
        populate_by_name = True
        
class Product(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: str
    url: Optional[str]
    price: str
    image: str = Field(default="")

class ColorPreferenceRequest(BaseModel):
    color: str

class SupportInfoRequest(BaseModel):
    supportEmail: str
    supportPhone: str
    countryCode: str = Field(default="+1", min_length=2, max_length=5)

class ShopImageRequest(BaseModel):
    imageUrl: str

class ShopImageResponse(BaseModel):
    success: bool

class GetImageResponse(BaseModel):
    image: Optional[str]

class UserInitiateRequest(BaseModel):
    """Defines the structure for the user initiation request."""
    email: EmailStr
    shopId: str
    utm_params: Optional[UTMParameters] = None

class UserInitiateResponse(BaseModel):
    """Defines the structure for the user initiation response."""
    token: str

class ShopAnalyticsSummaryResponse(BaseModel):
    """Defines the structure for the analytics summary response."""
    total_users: int
    total_chat_interactions: int
    total_opened_chatbot: int
    total_added_to_cart: int
    total_purchased: int
    total_purchase_amount: float
    daily_opened_chatbot: List[Dict[str, Any]] = []
    error: Optional[str] = None

class TrackPurchaseRequest(BaseModel):
    amount: float

class PlanDetailsRequest(BaseModel):
    owner_name: str
    owner_email: str
    owner_location: str
    plan: str

class ShopStatusResponse(BaseModel):
    setup_completed: bool
    plan: Optional[str] = None
    subscription_status: Optional[str] = None
    end_date: Optional[str] = None

class EmailGatePreferenceResponse(BaseModel):
    show_email_gate: bool
    shop_id: str

class EmailGatePreferenceRequest(BaseModel):
    show_email_gate: bool

class IntegrationRequest(BaseModel):
    title: str
    description: str

class IntegrationResponse(BaseModel):
    success: bool
    message: Optional[str] = None

class LocationInfo(BaseModel):
    country: Optional[str]
    region: Optional[str]
    city: Optional[str]
    ip: Optional[str]

class AuthPayloadModel(BaseModel):
    user_id: Optional[int]
    shop_id: Optional[int]
    is_guest: Optional[bool] = False

    @model_validator(mode="after")
    def validate_fields(cls, values):
        if not values.user_id or not values.shop_id:
            raise ValueError("Token is malformed.")
        return values

    def validate_shop_access(self, actual_shop_id: int):
        if self.shop_id != actual_shop_id:
            raise HTTPException(status_code=403, detail="User not authorized for this shop.")
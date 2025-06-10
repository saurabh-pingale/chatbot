from typing import List, Optional, Dict
from pydantic import BaseModel, Field

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

class ShopImageRequest(BaseModel):
    imageUrl: str

class ShopImageResponse(BaseModel):
    success: bool

class GetImageResponse(BaseModel):
    image: Optional[str]

class UserInitiateRequest(BaseModel):
    email: str
    shopId: str 

class UserInitiateResponse(BaseModel):
    token: str

class ShopAnalyticsSummaryResponse(BaseModel):
    total_users: int
    total_chat_interactions: int
    total_opened_chatbot: int
    total_added_to_cart: int
    total_purchased: int
    total_purchase_amount: float
    error: Optional[str] = None

class TrackPurchaseRequest(BaseModel):
    amount: float

class PlanDetailsRequest(BaseModel):
    owner_name: str
    owner_email: str
    owner_location: str
    plan: str

class ShopStatusResponse(BaseModel):
    plan: Optional[str]
    setup_completed: bool

class EmailGatePreferenceResponse(BaseModel):
    show_email_gate: bool
    shop_id: str

class EmailGatePreferenceRequest(BaseModel):
    show_email_gate: bool
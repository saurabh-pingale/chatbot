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

class StoreImageRequest(BaseModel):
    imageUrl: str

class StoreImageResponse(BaseModel):
    success: bool

class GetImageResponse(BaseModel):
    image: Optional[str]
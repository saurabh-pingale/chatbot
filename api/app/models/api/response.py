from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union
import json

class Product(BaseModel):
    """Model representing a product in the store"""
    id: Union[str, int]
    name: str 
    price: float
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    variant_id: Optional[str] = None

class BaseResponse(BaseModel):
    """Base response model with common fields"""
    success: bool = Field(default=True, description="Whether the operation was successful")
    error: Optional[str] = Field(None, description="Error message if success is False")

class ProductResponse(BaseResponse):
    """Schema for product query responses"""
    answer: str 
    product_ids: Optional[List[str]] = []
    products: Optional[List[Product]] = None
    categories: Optional[List[str]] = None
    available_categories: Optional[List[str]] = None
    not_found: Optional[bool] = False
    
    @field_validator('products', mode='before')
    def validate_products(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON string for products")
        return v

class OrderResponse(BaseResponse):
    """Response model for order-related queries"""
    answer: Optional[str] = Field(..., description="The detailed response to the user's order query")
    email: Optional[str] = Field(None, description="Support email if relevant")
    phone: Optional[str] = Field(None, description="Support phone if relevant")

class TermsToolResponse(BaseResponse):
    answer: str = Field(..., description="Response to the user's policy or terms-related query")
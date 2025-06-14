from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Union
import json

class UnifiedResponse(BaseModel):
    answer: str
    products: List[dict] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)
    additional_data: Optional[dict] = None

class Product(BaseModel):
    """Model representing a product in the store"""
    id: Union[str, int]
    name: str = Field(..., alias='title')
    price: float
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = Field(None, alias='image')
    variant_id: Optional[str] = None

class BaseResponse(BaseModel):
    """Base response model with common fields"""
    success: bool = Field(default=True, description="Whether the operation was successful")
    error: Optional[str] = Field(None, description="Error message if success is False")

class GreetingResponse(BaseResponse):
    """Schema for generating greeting responses"""
    welcome_message: str = Field(
        ...,
        description="A brief, warm, welcoming message to the user"
    )
    product_prompt: str = Field(
        ...,
        description="A suggestion for the user to ask about products"
    )
    category_mention: Optional[str] = Field(
        None,
        description="Optional mention of product categories if available"
    )

class ProductResponse(BaseResponse):
    """Schema for product query responses"""
    answer: str = Field(
        ...,
        description="The final, complete, and conversational answer to be shown to the user. This should incorporate an introduction, product details, suggestions, and a closing into one cohesive and natural-sounding text. If no products are found, it should still provide a helpful and complete response."
    )
    product_ids: Optional[List[str]] = Field(
        default=[],
        description="A list of product IDs that have been identified as relevant from the tool's results, which will be used for final filtering. This is a hidden field and should not be mentioned in the answer. You MUST populate this with the IDs of the products you discuss in the 'answer' field."
    )
    products: Optional[List[Product]] = Field(
        None,
        description="List of relevant products matching the query. This is populated by the system after filtering and should not be set by the AI."
    )
    categories: Optional[List[str]] = Field(
        None,
        description="List of relevant categories matching the query. This is populated by the system after filtering and should not be set by the AI."
    )
    suggestions: Optional[str] = Field(
        None,
        description="Product category suggestions if no direct matches found"
    )
    
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
    response_text: str = Field(..., description="The detailed response to the user's order query")
    email: Optional[str] = Field(None, description="Support email if relevant")
    phone: Optional[str] = Field(None, description="Support phone if relevant")
    requires_support: bool = Field(
        default=True, 
        description="Whether the user needs to contact support for further assistance"
    )

class TermsResponse(BaseResponse):
    """Response model for terms/policy queries"""
    response: str = Field(..., description="The detailed terms/policy response")
    sources: Optional[List[str]] = Field(
        None,
        description="List of source texts used to generate the response"
    )
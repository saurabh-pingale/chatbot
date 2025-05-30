from pydantic import BaseModel, Field
from typing import Optional, List, Union

class Product(BaseModel):
    """Model representing a product in the store"""
    id: str
    name: str
    price: float
    category: str
    description: Optional[str] = None
    image_url: Optional[str] = None

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
    introduction: str = Field(
        ...,
        description="Brief introduction or acknowledgment of the user's query"
    )
    id: Optional[Union[List[str], List[int], str, int]] = Field(
        None,
        description="Product IDs referenced in the response"
    )
    products: Optional[List[Product]] = Field(
        None,
        description="List of relevant products matching the query"
    )
    categories: Optional[List[str]] = Field(
        None,
        description="List of relevant categories"
    )
    suggestions: Optional[str] = Field(
        None,
        description="Product category suggestions if no direct matches found"
    )
    closing: Optional[str] = Field(
        None,
        description="Optional closing remark or follow-up question"
    )

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
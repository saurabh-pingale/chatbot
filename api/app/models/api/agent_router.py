from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

class AgentRouterResponse(BaseModel):
    answer: str
    products: List[Dict[str, Any]] = []
    categories: List[str] = Field(default_factory=list)
    history: List[Dict] = [] 

class ErrorResponse(BaseModel):
    detail: str

class FeedbackHistory(BaseModel):
    agent: str
    quality_score: float
    feedback: str
    timestamp: str
    attempt: int

class ClassificationType(str, Enum):
    """Enum for message classification types"""
    GREETING = "greeting"
    PRODUCT = "product"
    ORDER = "order"

class MessageClassification(BaseModel):
    """Schema for message classification"""
    classification: ClassificationType = Field(
        ...,
        description="Classification of the user message"
    )
    confidence: float = Field(
        ..., 
        description="Confidence score between 0 and 1",
        ge=0.0,
        le=1.0
    )
    reasoning: str = Field(
        ...,
        description="Brief explanation for this classification"
    )

class ResponseEvaluation(BaseModel):
    """Schema for evaluating agent responses"""
    quality_score: float = Field(
        ..., 
        description="Quality score on scale of 0-10",
        ge=0.0,
        le=10.0
    )
    strengths: str = Field(
        ...,
        description="Strengths of the response"
    )
    weaknesses: str = Field(
        ...,
        description="Areas for improvement in the response"
    )
    feedback: str = Field(
        ...,
        description="Actionable feedback for improving the response"
    )
    
    @validator('quality_score')
    def round_score(cls, v):
        """Round score to 1 decimal place"""
        return round(float(v), 1)


class FallbackResponse(BaseModel):
    """Schema for fallback responses"""
    apology: str = Field(
        ...,
        description="A brief, genuine apology for not understanding or having issues"
    )
    clarification_request: Optional[str] = Field(
        None,
        description="Request for clarification if appropriate"
    )
    suggestion: str = Field(
        ...,
        description="Suggestion for how to proceed or what information might help"
    )

class GreetingResponse(BaseModel):
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

class Product(BaseModel):
    """Schema for product information"""
    name: str = Field(..., description="Product name")
    price: str = Field(..., description="Product price with currency symbol")
    description: Optional[str] = Field(None, description="Product description if available")

class ProductResponse(BaseModel):
    """Schema for product query responses"""
    introduction: str = Field(
        ...,
        description="Brief introduction or acknowledgment of the user's query"
    )
    id: Optional[Union[List[str], List[int], str, int]] = Field(
        None,
        description="Product IDs referenced in the response, can be a single ID or a list of IDs"
    )
    products: Optional[List[Product]] = Field(
        None,
        description="List of relevant products matching the query"
    )
    suggestions: Optional[str] = Field(
        None,
        description="Product category suggestions if no direct matches found"
    )
    closing: Optional[str] = Field(
        None,
        description="Optional closing remark or follow-up question"
    )

class OrderResponse(BaseModel):
    """Response model for order-related queries"""
    response_text: str = Field(..., description="The detailed response to the user's order query")
    requires_support: bool = Field(
        default=True, 
        description="Whether the user needs to contact support for further assistance"
    )

class ConfidenceResponse(BaseModel):
    """Model for confidence score responses"""
    confidence_score: float = Field(..., description="Confidence score from 0 to 1 indicating how well the response addresses the user's needs")
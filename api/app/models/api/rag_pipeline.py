from typing import List, Dict, Optional, Any
from pydantic import BaseModel

# Request Model
class RagPipelineRequestBody(BaseModel):
    messages: Optional[List[Dict[str, str]]] = None
    isTrainingPage: Optional[bool] = False
    shopifyStore: Optional[str] = None
    shopifyAccessToken: Optional[str] = None


# Response Model
class RagPipelineResponse(BaseModel):
    answer: str
    products: Optional[List[Dict[str, str]]] = []
    categories: Optional[List[str]] = []


# Error Response Model
class ErrorResponse(BaseModel):
    message: str
    success: bool

class ProductEmbedding(BaseModel):
    id: str
    values: List[float]
    metadata: Dict[str, Any]

class VectorMetadata(BaseModel):
    text: str
    title: str
    description: str
    category: str
    url: str
    image: str
    price: str

class Vector(BaseModel):
    id: str
    values: List[float]
    metadata: VectorMetadata

class LLMResponse(BaseModel):
    response: str
    products: Optional[List[Dict[str, Any]]] = None
    categories: Optional[List[Dict[str, Any]]] = None

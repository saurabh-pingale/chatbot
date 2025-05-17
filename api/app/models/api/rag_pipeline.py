from typing import List, Dict, Optional, Any, Union
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
    id: int
    values: List[float]
    metadata: Dict[str, Any]

class VectorMetadata(BaseModel):
    text: Optional[str] = None
    title: str
    description: str
    category: str
    type: str
    url: str
    image: str
    price: str
    variant_id: str

class Vector(BaseModel):
    id: int
    values: List[float]
    metadata: Union[VectorMetadata, Dict[str, Any]]

class LLMResponse(BaseModel):
    response: str
    products: Optional[List[Dict[str, Any]]] = None
    categories: Optional[List[Dict[str, Any]]] = None
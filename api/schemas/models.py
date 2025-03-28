from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ShopifyProduct(BaseModel):
    id: str
    title: str
    description: Optional[str]
    category: str
    url: Optional[str]
    price: str
    image: str = Field(default="")

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

class DeepseekRequestBody(BaseModel):
    messages: Optional[List[Dict[str, str]]] = None
    isTrainingPage: Optional[bool] = False
    shopifyStore: Optional[str] = None
    shopifyAccessToken: Optional[str] = None

class LLMResponse(BaseModel):
    response: str
    products: Optional[List[Dict[str, Any]]] = None
    categories: Optional[List[Dict[str, Any]]] = None
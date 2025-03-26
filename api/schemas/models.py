from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class ShopifyProduct(BaseModel):
    id: str
    title: str
    description: Optional[str]
    url: Optional[str]
    price: str
    image: str

class ProductEmbedding(BaseModel):
    id: str
    values: List[float]
    metadata: Dict[str, Any]

class VectorMetadata(BaseModel):
    text: str
    url: str
    image: str

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
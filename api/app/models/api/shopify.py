from typing import Optional, Dict
from pydantic import BaseModel

class ShopifyProduct(BaseModel):
    id: str
    title: str
    description: str
    category: str
    handle: str
    url: str
    price: str
    image: str
    variant_id: str 
    metafields: Dict[str, str]

class ShopifyCollection(BaseModel):
    id: str
    title: str
    products_count: int
    handle: str
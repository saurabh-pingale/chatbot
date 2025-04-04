from typing import Optional
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

class ShopifyCollection(BaseModel):
    id: str
    title: str
    products_count: int
    handle: str
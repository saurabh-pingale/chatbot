from pydantic import Field, BaseModel

class ProductEntity(BaseModel):
    """Extracts structured product information from user queries."""
    
    query: str = Field(
        ...,
        description="The user's original, unmodified query text."
    )
    
    category: str = Field(
        "product",
        description="The extracted product category, defaulting to 'product' if not specified. Examples: 'shirt', 'T-shirt', 'shoes'."
    )
    
    color: str = Field(
        "any",
        description="The extracted color, defaulting to 'any' if not specified. Examples: 'red', 'black', 'blue'."
    )
    
    attributes: list[str] = Field(
        default_factory=list,
        description="A list of other relevant product attributes mentioned. Examples: 'long-sleeve', 'cotton', 'waterproof'."
    ) 
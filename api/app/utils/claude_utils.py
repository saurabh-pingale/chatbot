from app.models.api.response import ProductResponse

def extract_normalized_response_text(product_response_data: ProductResponse) -> str:
    """Extracts and concatenates textual fields from ProductResponse for filtering purposes."""
    text_parts = []
    introduction = getattr(product_response_data, 'introduction', None)
    if introduction:
        text_parts.append(str(introduction).lower())

    closing = getattr(product_response_data, 'closing', None)
    if closing:
        text_parts.append(str(closing).lower())
        
    return " ".join(text_parts)
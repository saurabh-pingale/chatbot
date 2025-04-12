import re
from typing import List, Dict, Any

def extract_products_from_response(query_results: List[Any]) -> List[Dict[str, Any]]:
    """Extracts and filters products from query results."""
    products = [
        {
            "id": result.id,
            "title": result.metadata.title,
            "price": result.metadata.price,
            "url": result.metadata.url,
            "image": result.metadata.image,
            "category": getattr(result.metadata, "category", "None"),
            "variant_id": getattr(result.metadata, "variant_id", ""),
        }
        for result in query_results
        if result and result.metadata
    ]
    return [product for product in products if product["title"] and product["url"]]


def format_context_texts(query_results: List[Any]) -> str:
    """Formats context texts from query results."""
    return "\n".join(
        f"Product: Title: {result.metadata.title}, Description: {result.metadata.description}, "
        f"Category: {result.metadata.category}, Price: {result.metadata.price}."
        for result in query_results
        if result and result.metadata
    )


def clean_response_from_llm(response: str) -> str:
    cleaned_response = response
    cleaned_response = re.sub(
        r"<\/?think>|<\/?reasoning>", "", cleaned_response, flags=re.IGNORECASE
    )
    cleaned_response = re.sub(
        r"^\s*\n", "", cleaned_response, flags=re.MULTILINE
    ).strip()

    if "</think>" in cleaned_response or len(cleaned_response) > 300:
        last_paragraph = (
            cleaned_response.split("\n\n")[-1]
            if "\n\n" in cleaned_response
            else cleaned_response
        )
        cleaned_response = last_paragraph.strip()

    return cleaned_response


def extract_user_message_from_prompt(prompt: str) -> str:
    """
    Extracts the user message from the prompt.
    If the prompt contains 'Question:', it extracts the content after it.
    Otherwise, returns the original prompt.
    """
    user_message_match = re.search(r"Question:\s*(.*?)(?:\n|$)", prompt)
    return user_message_match.group(1) if user_message_match else prompt


def is_product_query(user_message: str, products: List[Dict]) -> bool:
    """
    Checks if the user message specifically asks for products or categories.
    Returns False for generic product requests.
    """
    lower_user_message = user_message.lower().strip()

    greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]
    if lower_user_message in greetings:
        return False

    product_phrases = [
        "product", "item", "merchandise", "goods",
        "show me the", "where can i find", "looking for",
        "do you have", "recommend some", "suggest some",
        "what are the", "which are the", "price of", "cost of",
        "buy", "purchase", "shop for", "find me"
    ]

    category_phrases = [
        "in the", "from the", "under", "category", "type of", "kind of",
        "brand", "make", "model"
    ]


    product_name_match = any(
        product["title"].lower() in lower_user_message
        for product in products
    )

    category_name_match = any(
        product["category"].lower() in lower_user_message
        for product in products
    )

    specific_product_request = any(
        phrase in lower_user_message for phrase in product_phrases
    )

    category_request = (
        any(indicator in lower_user_message for indicator in category_phrases) and
        any(term in lower_user_message for term in ["product", "item"])
    )
  
    is_generic = any(
        phrase in lower_user_message
        for phrase in ["show me products", "list products", "all products", "every product"]
    )
    
    return (product_name_match or 
            category_name_match or 
            specific_product_request or 
            category_request) and not is_generic


def filter_relevant_products(products: List[Dict], user_message: str) -> List[Dict]:
    """
    Filters products based on the user message, only including relevant ones.
    """
    lower_user_message = user_message.lower()
    relevant_products = []
    
    mentioned_products = [
        product["title"].lower() 
        for product in products 
        if product["title"].lower() in lower_user_message
    ]
    
    mentioned_categories = [
        product["category"].lower() 
        for product in products 
        if product["category"].lower() in lower_user_message
    ]
    
    for product in products:
        product_name = product["title"].lower()
        product_category = product["category"].lower()
        
        if (product_name in mentioned_products or 
            product_category in mentioned_categories):
            relevant_products.append({
                "id": product["id"],
                "title": product["title"],
                "price": product["price"],
                "url": product["url"],
                "image": product["image"],
                "category": product["category"],
                "variant_id": product.get("variant_id", "")
            })
    
    return relevant_products

def extract_categories(transformed_products):
    unique_categories = list({p.get("category", "") for p in transformed_products})
    categories = [{"name": cat} for cat in unique_categories if cat] 
    return categories
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
    Checks if the user message indicates a product-related query.
    """
    lower_user_message = user_message.lower()

    # Check for common product-related phrases
    if any(
        phrase in lower_user_message
        for phrase in ["product", "show me", "list", "items"]
    ):
        return True

    # Check if the user message contains any product name
    for product in products:
        product_name = (
            product.get("product", "").lower().split("no description")[0].strip()
        )
        if product_name in lower_user_message:
            return True

    return False


def filter_relevant_products(products: List[Dict], user_message: str) -> List[Dict]:
    lower_user_message = user_message.lower()
    transformed_products = []

    for product in products:
        include = False
        if "show" in lower_user_message or "list" in lower_user_message:
            include = True
        else:
            product_name = product["title"].lower().strip()
            include = product_name in lower_user_message

        if include:
            transformed_products.append(
                {
                    "id": product["id"],
                    "title": product["title"],
                    "price": product["price"],
                    "url": product["url"],
                    "image": product["image"],
                }
            )
    return transformed_products

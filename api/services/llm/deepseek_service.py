import os
import re
from typing import List, Dict, Optional
from huggingface_hub import InferenceClient
from schemas.models import LLMResponse

def is_greeting(message: str) -> bool:
    greetings = ["hi", "hello", "hey", "how are you", "good morning", "good evening", "good afternoon"]
    clean_message = message.lower().strip()
    return any(
        clean_message == greeting or 
        clean_message.startswith(f"{greeting} ") or 
        clean_message.endswith(f" {greeting}")
        for greeting in greetings
    )

async def generate_llm_response(prompt: str, products: List[Dict] = []) -> LLMResponse:
    hf = InferenceClient(token=os.getenv("HUGGINGFACE_API_KEY"))

    user_message_match = re.search(r"Question:\s*(.*?)(?:\n|$)", prompt)
    user_message = user_message_match.group(1) if user_message_match else prompt

    if is_greeting(user_message):
        return LLMResponse(
            response="How can I assist you today? If you have any questions about our products, feel free to ask! I'm here to help you with all things!",
            products=[]
        )

    try:
        response = hf.text_generation(
            model="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
            prompt=prompt, 
            max_new_tokens=200,
            temperature=0.3,
            do_sample=True,
            return_full_text=False,
        )
       
        cleaned_response = response
        cleaned_response = re.sub(r'<\/?think>|<\/?reasoning>', '', cleaned_response, flags=re.IGNORECASE)
        cleaned_response = re.sub(r'^\s*\n', '', cleaned_response, flags=re.MULTILINE).strip()

        if '</think>' in cleaned_response or len(cleaned_response) > 300:
            last_paragraph = cleaned_response.split('\n\n')[-1] if '\n\n' in cleaned_response else cleaned_response
            cleaned_response = last_paragraph.strip()

        lower_user_message = user_message.lower()
        
        is_product_query = (
            'product' in lower_user_message or 
            'show me' in lower_user_message or 
            'list' in lower_user_message or 
            'items' in lower_user_message or 
            any(p['product'].lower().split('no description')[0].strip() in lower_user_message for p in products)
        )
        
        if is_product_query:
            transformed_products = []
            for product in products:
                if 'show' in lower_user_message or 'list' in lower_user_message:
                    include = True
                else:
                    product_name = product['product'].lower().split('no description')[0].strip()
                    include = product_name in lower_user_message
                
                if include:
                    product_parts = product['product'].split('No description available')
                    title = product_parts[0].strip()
                    price_part = product_parts[1].strip() if len(product_parts) > 1 else ''
                    price = f"${price_part}" if price_part else 'Price not available'
                    
                    transformed_products.append({
                        "id": product["id"],
                        "title": title,
                        "price": price,
                        "url": product["url"],
                        "image": product["image"]
                    })

            return LLMResponse(response=cleaned_response, products=transformed_products)
        else:
            return LLMResponse(response=cleaned_response, products=[])
    except Exception as error:
        print(f"Error generating response: {error}")
        return LLMResponse(response="I don't have much information on this.")

def create_deepseek_prompt(user_message: str, context_texts: Optional[str] = None) -> str:
    return f"""
     You are a specialized product assistant that helps users find products from a catlog.

     Instructions:
     1. If the user asks for products (e.g., "Show me snowboards" or "List products"), provide a list of products from the catalog.
     2. If the user asks about a specific product (e.g., "Tell me about the Green Snowboard" or "Snowboard"), provide details about that product.
     3. If the user asks about features or specifications of a product, provide only factual information from the catalog.
     4. If no products match the user's query, respond with: "I couldn't find any products matching your request..."
     5. Do not make assumptions about products not in the catalog.
     6. Keep responses concise and focused on the products.
     7. Do not use phrases like "based on the Product Catlog" or "according to the information provided."
     8. Do not include thinking tags or explanations of your reasoning process.

    Product Catlog: {context_texts or ''}

    User: {user_message}
    """
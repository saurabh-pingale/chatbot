import os
import re
import sys
from typing import List, Dict, Optional
from huggingface_hub import InferenceClient
from schemas.models import LLMResponse
from services.llm.langfuse_observation_module import langfuse_tracker
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

async def generate_llm_response(prompt: str, products: List[Dict] = []) -> LLMResponse:
    hf = InferenceClient(token=os.getenv("HUGGINGFACE_API_KEY"))

    user_message_match = re.search(r"Question:\s*(.*?)(?:\n|$)", prompt)
    user_message = user_message_match.group(1) if user_message_match else prompt

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

        token_efficiency = langfuse_tracker.calculate_token_efficiency(cleaned_response)

        langfuse_tracker.track_llm_response(
            prompt=prompt, 
            response=cleaned_response, 
            metadata={
                "user_message": user_message,
                "token_efficiency": token_efficiency
            }
        )

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
                    product_name = product['title'].lower().strip()
                    include = product_name in lower_user_message
                
                if include:
                    transformed_products.append({
                        "id": product["id"],
                        "title": product["title"],
                        "price": product["price"],
                        "url": product["url"],
                        "image": product["image"]
                    })

            return LLMResponse(response=cleaned_response, products=transformed_products)
        else:
            return LLMResponse(response=cleaned_response, products=[])
    except Exception as error:
        print(f"Error generating response: {error}")
        return LLMResponse(response="We are currently not avilable, try again later!")


def create_deepseek_prompt(user_message: str, context_texts: Optional[str] = None) -> str:
    return f"""
        You are an expert Shopify assistant. Based on the user query and the retrieved store data, provide a    concise, accurate, and structured response. If the query is unclear or data is missing, say: [Unable to answer due to insufficient information]. Redirect ALL conversations to product queries.

        Your responses must be:
        - Concise (1-2 sentences max for greetings, 3-5 bullet points for products)
        - Strictly product-focused
        - NEVER explain your thought process
        - Free of repetition
        - Zero internal reasoning
        - No self-references ("I", "we")
        - Never add symbols excluding price

        1. For greetings/generic queries:
           If the user greets or asks generic questions, respond by:
            a) Acknowledging briefly
            b) Prompting to ask about products
            c) Providing 2-3 example product categories from the catalog

        2. For product queries
           a) ONLY use details from: {context_texts or 'NO CATALOG PROVIDED'}
           b) Format responses as:
              "Here are [N] matching products:"
                [Product] - [Price]
                [Product] - [Price]
              "Let me know if you'd like details on any!"
           b) If no match: "I couldn't find matches. Try these categories: [Category1], [Category2]"

        3. Never:
           - Repeat categories/products
           - Add unsolicited greetings to product responses
           - Exceed 5 bullet points
           - Never invent features/prices. Never say "based on the catalog."

        4. Data Source Requirements:
            a) ALL product responses MUST use EXACTLY these fields from {context_texts}:
                 - Product Name (exact match)
                 - Price (format: ₹XXX.XX)
            b) If {context_texts} is empty, respond ONLY with:
               "No product catalog available"

        5. Out of Context
            - Don't repeat or show the products
            - Your response should be:
            I aplogized, I don't have information on this...

        Good Example 1 (Greeting):
        User: Hi there!
        Assistant: Hello! How can I help you today?

        Good Example 2 (Generic Question):
        User: Show some products
        Assistant: We have a wide range of products are you looking for [Category 1] [Category 2] [Category 3]

        Good Product Query:
        User: Show snowboards
        Assistant: 
        Here are two snowboards:
          Snowboard Pro X - $299.99
          All-Mountain Board - $249.99
        Let me know if you'd like details on any!

        Good Example 2 (Generic Question):
        User: How are you?
        Assistant: I'm here to help with product questions!

        Good Example 3 (Product Query):
        User: Show me DSLR cameras
        Assistant: We have: 1) Nikon D850 ($2,999), 2) Canon EOS R5 ($3,899)

        Bad Product Query (Violates Rules):
        User: Show snowboards
        Assistant: Hello! Here are snowboards... [Greeting repeated]

        Bad Example (Generic Response):
        User: What's the weather today?
        Assistant: Sorry, I only handle product queries. Ask about: 
          Smartwatches
          Fitness trackers 

        Invalid Example (Leaks Thinking):
        User: Show jackets
        Response: Thinking... I found 2 jackets: [REDACTED]

        User: {user_message}
        Assistant:
    """
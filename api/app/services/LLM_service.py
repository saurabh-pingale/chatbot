import re
from typing import List, Dict
from huggingface_hub import InferenceClient

from app.config import HUGGING_FACE_API_KEY
from app.models.api.rag_pipeline import LLMResponse
from app.external_service.langfuse_observations import langfuse_tracker

async def generate_llm_response(prompt: str, products: List[Dict] = []) -> LLMResponse:
    hugging_face_client = InferenceClient(token=HUGGING_FACE_API_KEY)

    user_message_match = re.search(r"Question:\s*(.*?)(?:\n|$)", prompt)
    user_message = user_message_match.group(1) if user_message_match else prompt

    try:
        response = hugging_face_client.text_generation(
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

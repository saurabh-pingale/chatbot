from huggingface_hub import InferenceClient
from app.config import HUGGING_FACE_API_KEY

async def generate_text_from_huggingface(prompt: str) -> str:
    hugging_face_client = InferenceClient(token=HUGGING_FACE_API_KEY)
    try:
        response = hugging_face_client.text_generation(
            model="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
            prompt=prompt, 
            max_new_tokens=200,
            temperature=0.3,
            do_sample=True,
            return_full_text=False,
        )
        return response
    except Exception as error:
        print(f"Error in HuggingFace API: {error}")
        return ""

import httpx
from app.config import DEEPSEEK_API_URL, DEEPSEEK_API_KEY

DEEPSEEK_API_URL = DEEPSEEK_API_URL
DEEPSEEK_API_KEY = DEEPSEEK_API_KEY

async def generate_text_from_huggingface(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 200,
        "top_p": 0.9,
        "stream": False
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                DEEPSEEK_API_URL,
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
    except Exception as error:
        print(f"Error in Mistral Inference: {error}")
        return ""

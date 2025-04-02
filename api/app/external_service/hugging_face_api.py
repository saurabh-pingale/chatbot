import httpx

from app.config import DEEPSEEK_API_URL, DEEPSEEK_API_KEY
from app.utils.logger import logger

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_API_KEY = "sk-6f4adb59d3784402b44d86de27a6297e"

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
        logger.error("Error in Mistral Inference: %s", str(error), exc_info=True)
        return ""

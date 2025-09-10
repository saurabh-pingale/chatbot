import json
import httpx
from typing import Dict, Any

from app.config import ANTHROPIC_API_KEY
from app.constants import CLAUDE_API_URL, CLAUDE_MODEL_NAME
from app.utils.logger import logger

class LLMService:
    def __init__(self):
        self.api_key = ANTHROPIC_API_KEY
        self.api_url = CLAUDE_API_URL
        self.model = CLAUDE_MODEL_NAME
        self.headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

    async def generate_json(self, prompt: str) -> Dict[str, Any]:
        """ Calls the Claude API with a specific prompt to generate a structured JSON object. """

        system_prompt = (
            "You are an expert data structuring assistant. Your task is to analyze the provided "
            "e-commerce data and generate a valid JSON object according to the user's instructions. "
            "You must only output the raw JSON object and nothing else. Do not include any "
            "introductory text, explanations, or code block formatting like ```json."
        )

        body = {
            "model": self.model,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [{"role": "user", "content": prompt}]
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(self.api_url, headers=self.headers, json=body)
                response.raise_for_status()
                
                data = response.json()
                
                if not data.get("content") or data["content"][0].get("type") != "text":
                    logger.error("Claude API response is missing the expected text content block.")
                    raise ValueError("Invalid response format from Claude API")

                json_text = data["content"][0]["text"]
                
                return json.loads(json_text)

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error calling Claude API: {e.response.status_code} - {e.response.text}")
                raise RuntimeError(f"Claude API request failed with status {e.response.status_code}: {e.response.text}") from e
            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode JSON from Claude API response: {e}")
                logger.error(f"Raw response text: {json_text}")
                raise ValueError(f"Invalid JSON received from Claude API: {e}") from e
            except Exception as e:
                logger.error(f"An unexpected error occurred when calling Claude API: {e}", exc_info=True)
                raise RuntimeError(f"Unexpected error when calling Claude API: {e}") from e
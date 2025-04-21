import re
import time
import json
import requests
from typing import Type, TypeVar, Any, Dict
from pydantic import BaseModel
from app.utils.logger import logger
from app.config import CLUADE_API_KEY
from app.constants import CLUADE_API_URL, CLUADE_MODEL_NAME

T = TypeVar('T', bound=BaseModel)

class HuggingFaceClient:
    """Client for interacting with Hugging Face's Inference API"""
    
    async def _call_huggingface_api(
        self, 
        system_message: str,
        user_message: str,
        temperature: float = 0.7,
        max_new_tokens: int = 500
    ) -> str:
        """Call the Claude Haiku API"""
        try:
            start_time = time.time() 

            headers = {
                "x-api-key": CLUADE_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }

            prompt_content = []
            if system_message:
                prompt_content.append({"role": "system", "content": system_message})
            prompt_content.append({"role": "user", "content": user_message})
            
            payload = {
                "model": CLAUDE_MODEL_NAME,
                "messages": prompt_content,
                "temperature": temperature,
                "top_p": 0.95,
                "max_tokens": max_new_tokens
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    CLUADE_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                json_response = response.json()

            end_time = time.time()
            elapsed_time = end_time - start_time
            logger.info(f"Hugging Face API call took {elapsed_time:.2f} seconds")
                  
            content = (
                json_response.get("content", [{}])[0].get("text", "")
                if isinstance(json_response.get("content"), list)
                else ""
            )

            response_data = response.json()
            if not isinstance(response_data, list) or not response_data:
                logger.error(f"Invalid response format: {response_data}")
                return "Error: Invalid response format"
                
            if not content:
                logger.error("Claude response has no content")
                return "Error: Empty response from Claude"

            logger.info(f"Claude API response: {content}")
            return content
            
        except Exception as e:
            logger.error(f"Error calling Claude API: {str(e)}", exc_info=True)
            return f"Error: Unable to generate response due to {str(e)}"
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON object from text response"""
        try:
            json_match = re.search(r'(\{.*?\})', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                logger.warning("No JSON object found in response, attempting to parse manually")
                result = {}
                kv_patterns = re.findall(r'["\']*(\w+)["\']*\s*[:=]\s*["\']*([^,}"\'\n]+)["\']*', text)
                for key, value in kv_patterns:
                    result[key] = value.strip()
                return result
        except Exception as e:
            logger.error(f"Error extracting JSON from text: {str(e)}", exc_info=True)
            return {}
    
    def _convert_to_model(self, model_class: Type[T], data: Dict[str, Any]) -> T:
        """Convert dictionary data to a Pydantic model instance"""
        try:
            processed_data = {}
            for field_name, field in model_class.model_fields.items():
                if field_name in data:
                    value = data[field_name]
                    field_type = field.annotation
                    
                    if field_type is float and isinstance(value, str):
                        try:
                            processed_data[field_name] = float(value)
                        except ValueError:
                            processed_data[field_name] = 0.0
                    elif field_type is int and isinstance(value, str):
                        try:
                            processed_data[field_name] = int(value)
                        except ValueError:
                            processed_data[field_name] = 0
                    elif field_type is bool and isinstance(value, str):
                        processed_data[field_name] = value.lower() in ['true', 'yes', '1']
                    else:
                        processed_data[field_name] = value
            
            return model_class(**processed_data)
        except Exception as e:
            logger.error(f"Error converting to model: {str(e)}", exc_info=True)
            return self._create_fallback_instance(model_class, str(e))
    
    def _create_fallback_instance(self, model_class: Type[T], error_msg: str) -> T:
        """Create a fallback instance of the model with default/error values"""
        try:
            field_values = {}
            for field_name, field in model_class.model_fields.items():
                if field.is_required():
                    annotation = field.annotation
                    if hasattr(annotation, "__name__") and annotation.__name__ == "ClassificationType":
                        field_values[field_name] = "greeting"
                    elif annotation is str:
                        field_values[field_name] = f"Error fallback: {error_msg[:50]}"
                    elif annotation is float:
                        field_values[field_name] = 0.5
                    elif annotation is bool:
                        field_values[field_name] = False
                    elif annotation is int:
                        field_values[field_name] = 0
                    else:
                        field_values[field_name] = None
            
            return model_class(**field_values)
        except Exception as inner_e:
            logger.error(f"Failed to create fallback instance: {str(inner_e)}", exc_info=True)
            raise
    
    async def generate(
        self,
        model_class: Type[T],
        user_message: str,
        system_message: str,
        temperature: float = 0.7,
        max_new_tokens: int = 500
    ) -> T:
        """Generate a response and convert it to the specified Pydantic model"""
        try:
            response_text = await self._call_huggingface_api(
                system_message=system_message,
                user_message=user_message,
                temperature=temperature,
                max_new_tokens=max_new_tokens
            )
            
            data = self._extract_json(response_text)
            logger.info(f"Extracted data: {data}")
            
            result = self._convert_to_model(model_class, data)
            logger.info(f"Converted result: {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in generate: {str(e)}", exc_info=True)
            return self._create_fallback_instance(model_class, str(e))
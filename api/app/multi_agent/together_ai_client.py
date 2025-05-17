import re
import json
import requests
from typing import Type, TypeVar, Any, Dict
from pydantic import BaseModel
from app.utils.logger import logger
from app.config import TOGETHER_API_KEY
from app.constants import TOGETHER_API_URL, TOGETHER_MODEL_NAME

T = TypeVar('T', bound=BaseModel)

class TogetherAIClient:
    """Client for interacting with Together AI's Inference API"""

    def __init__(self):
        self.model_name = TOGETHER_MODEL_NAME
        self.api_url = TOGETHER_API_URL
        self.api_token = TOGETHER_API_KEY

        if not self.api_token:
            raise ValueError("TOGETHER_API_KEY environment variable not set")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
    
    async def _call_together_api(
        self, 
        system_message: str,
        user_message: str,
        temperature: float = 0.7,
        max_new_tokens: int = 500
    ) -> str:
        """Call the Together AI API"""
        try:
            payload = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                "temperature": temperature,
                "max_tokens": max_new_tokens,
                "top_k": 50,
                "top_p": 0.95,
            }

            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=60
            )

            if response.status_code != 200:
                error_msg = f"API request failed with status {response.status_code}: {response.text}"
                logger.error(error_msg)
                return "Error: API request failed"
                  
            response_data = response.json()
            choices = response_data.get("choices", [])
            if not choices:
                logger.error(f"Invalid response format: {response_data}")
                return "Error: Invalid response format"

            generated_text = choices[0]["message"]["content"]
            return generated_text.strip()

        except Exception as e:
            logger.error(f"Error calling HuggingFace API: {str(e)}", exc_info=True)
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
            response_text = await self._call_together_api(
                system_message=system_message,
                user_message=user_message,
                temperature=temperature,
                max_new_tokens=max_new_tokens
            )
            
            data = self._extract_json(response_text)
            
            result = self._convert_to_model(model_class, data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in generate: {str(e)}", exc_info=True)
            return self._create_fallback_instance(model_class, str(e))
from typing import Type, TypeVar, Optional
from pydantic import BaseModel
import requests
from app.utils.logger import logger
from app.config import HUGGINGFACE_API
from pydantic_ai.agent import Agent

T = TypeVar('T', bound=BaseModel)

class HuggingFaceClient:
    """Client for interacting with Hugging Face's Inference API"""
    
    def __init__(self):
        self.model_name = "google/gemma-2b-it"
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        self.api_token = HUGGINGFACE_API
        if not self.api_token:
            raise ValueError("HUGGINGFACE_API_TOKEN environment variable not set")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        self.pydantic_ai = Agent()
        self.pydantic_ai.llm_api = self._call_huggingface_api

        self._registered_models = set()
        
    async def _call_huggingface_api(
        self, 
        prompt: str, 
        system_message: Optional[str] = None,
        **kwargs
    ) -> str:
        """Custom LLM API calling function for PydanticAI"""
        try:
            full_prompt = prompt
            if system_message:
                full_prompt = f"{system_message}\n\n{prompt}"
                
            formatted_prompt = (
                f"<start_of_turn>system\n{full_prompt}<end_of_turn>\n"
                f"<start_of_turn>user\n{kwargs.get('user_message', '')}<end_of_turn>\n"
                f"<start_of_turn>model\n"
            )
            
            payload = {
                "inputs": formatted_prompt,
                "parameters": {
                    "max_new_tokens": kwargs.get("max_new_tokens", 500),
                    "temperature": kwargs.get("temperature", 0.7),
                    "top_k": 50,
                    "top_p": 0.95,
                    "return_full_text": False
                }
            }
            
            logger.info(f"Calling HuggingFace API with payload: {payload}")
            
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload
            )
            
            if response.status_code != 200:
                error_msg = f"API request failed with status {response.status_code}: {response.text}"
                logger.error(error_msg)
                return ""
                
            generated_text = response.json()[0]['generated_text']
            logger.info(f"HuggingFace API response: {generated_text}")
            
            return generated_text
            
        except Exception as e:
            logger.error(f"Error calling HuggingFace API: {str(e)}", exc_info=True)
            return ""
        
    async def generate(
        self,
        model_class: Type[T],
        user_message: str,
        system_message: str,
        temperature: float = 0.7,
        max_new_tokens: int = 500
    ) -> T:
        try:    
            if model_class not in self._registered_models:
                def tool_fn():
                    return model_class()

                self.pydantic_ai.tool(tool_fn)
                self._registered_models.add(model_class)

            result = await self.pydantic_ai.run(
                user_message,
                system_message,
                temperature,
                max_new_tokens
            )
            
            logger.info(f"PydanticAI result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error in generate: {str(e)}", exc_info=True)
            try:
                field_values = {}
                for field_name, field in model_class.__fields__.items():
                    if field.is_required():
                        annotation = field.annotation
                        if hasattr(annotation, "__name__") and annotation.__name__ == "ClassificationType":
                            field_values[field_name] = "greeting"
                        elif annotation is str:
                            field_values[field_name] = f"Error fallback: {str(e)[:50]}"
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
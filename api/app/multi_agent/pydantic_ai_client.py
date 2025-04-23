import json
import httpx
import regex
import hashlib
from typing import TypeVar, Type, Dict, Any, Optional
from pydantic import BaseModel
from app.config import CLAUDE_API_KEY
from app.constants import CLAUDE_API_URL
from app.utils.logger import logger
from datetime import datetime, timedelta
import threading

T = TypeVar('T', bound=BaseModel)

class CacheEntry:
    """Class to hold cached responses with timestamps for expiration"""
    def __init__(self, data: Any, ttl_seconds: int = 3600):
        self.data = data
        self.timestamp = datetime.now()
        self.ttl_seconds = ttl_seconds
        
    def is_expired(self) -> bool:
        """Check if the cache entry has expired"""
        return datetime.now() > self.timestamp + timedelta(seconds=self.ttl_seconds)

class DeepseekAIClient:
    """
    Client for generating structured responses from Deepseek API 
    using Pydantic models for validation and structure with caching support
    """
    # Class-level cache dictionary
    _cache: Dict[str, CacheEntry] = {}
    _cache_lock = threading.RLock()  # Thread-safe operations
    
    @staticmethod
    def _generate_cache_key(
        model_class: Type[T], 
        user_message: str, 
        system_message: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
        top_p: float = 0.9,
        schema_instructions: Optional[str] = None
    ) -> str:
        """
        Generate a unique cache key for the request parameters
        
        Returns:
            A hash string to use as cache key
        """
        # Create a dictionary of all parameters that affect the response
        cache_dict = {
            "model_class": model_class.__name__,
            "user_message": user_message,
            "system_message": system_message,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "schema_instructions": schema_instructions,
            "schema": json.dumps(model_class.model_json_schema())
        }
        
        # Convert to a stable string and hash it
        cache_str = json.dumps(cache_dict, sort_keys=True)
        return hashlib.md5(cache_str.encode('utf-8')).hexdigest()
    
    @staticmethod
    def clear_cache() -> None:
        """Clear the entire cache"""
        with DeepseekAIClient._cache_lock:
            DeepseekAIClient._cache.clear()
            logger.info("Cache cleared")
    
    @staticmethod
    def get_cache_stats() -> Dict[str, int]:
        """Get cache statistics"""
        with DeepseekAIClient._cache_lock:
            total = len(DeepseekAIClient._cache)
            expired = sum(1 for entry in DeepseekAIClient._cache.values() if entry.is_expired())
            
        return {
            "total_entries": total,
            "active_entries": total - expired,
            "expired_entries": expired
        }
    
    @staticmethod
    def remove_expired_entries() -> int:
        """Remove expired entries from cache and return count of removed items"""
        with DeepseekAIClient._cache_lock:
            keys_to_remove = [
                key for key, entry in DeepseekAIClient._cache.items() 
                if entry.is_expired()
            ]
            
            for key in keys_to_remove:
                del DeepseekAIClient._cache[key]
                
            logger.debug(f"Removed {len(keys_to_remove)} expired cache entries")
            return len(keys_to_remove)
    
    @staticmethod
    async def generate(
        model_class: Type[T],
        user_message: str,
        system_message: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
        top_p: float = 0.9,
        schema_instructions: Optional[str] = None,
        cache_ttl: int = 3600,  # Cache TTL in seconds, default 1 hour
        bypass_cache: bool = False 
    ) -> T:
        """
        Generate structured data from the Deepseek API based on a Pydantic model
        with caching support
        
        Args:
            model_class: Pydantic model class to structure the response
            user_message: User message or prompt
            system_message: Optional system message
            temperature: Sampling temperature (higher = more creative)
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
            schema_instructions: Optional custom instructions for schema usage
            cache_ttl: Time-to-live for cache entries in seconds
            bypass_cache: Whether to bypass the cache and force a fresh API call
            
        Returns:
            Instance of the provided Pydantic model
        """
        logger.info(f"System Message: {system_message}")
        logger.info(f"User Message: {user_message}")
        # Generate cache key
        cache_key = DeepseekAIClient._generate_cache_key(
            model_class, user_message, system_message, 
            temperature, max_tokens, top_p, schema_instructions
        )
        
        # Try to get from cache if not bypassing
        if not bypass_cache:
            with DeepseekAIClient._cache_lock:
                if cache_key in DeepseekAIClient._cache:
                    cache_entry = DeepseekAIClient._cache[cache_key]
                    
                    # Check if entry is still valid
                    if not cache_entry.is_expired():
                        logger.info(f"Cache hit for {model_class.__name__}")
                        return cache_entry.data
                    else:
                        # Remove expired entry
                        del DeepseekAIClient._cache[cache_key]
                        logger.debug(f"Removed expired cache entry for {model_class.__name__}")
        
        # Clean cache occasionally (10% chance)
        if hash(cache_key) % 10 == 0:
            DeepseekAIClient.remove_expired_entries()
        
        schema = model_class.model_json_schema()
        schema_str = json.dumps(schema, indent=2)
        
        messages = []
        
        if system_message:
            messages.append({"role": "system", "content": system_message})
        
        schema_prompt = schema_instructions or f"""
        You are an API that must return JSON only.
        The output must match this JSON schema exactly:
        {schema_str}
        
        Do not include any additional explanation or text.
        Only return a valid JSON object.
        """
        
        messages.append({"role": "system", "content": schema_prompt})
        
        messages.append({"role": "user", "content": user_message})
        
        try:
            logger.info(f"Calling Claude Haiku API with {len(messages)} messages")
            headers = {
                "x-api-key": CLAUDE_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": "claude-3-haiku-20240307",
                "messages": [
                    {"role": "user", "content": f"{system_message or ''}\n{schema_prompt}\nUser: {user_message}"}
                ],
                "temperature": temperature,
                "top_p": top_p,
                "max_tokens": max_tokens
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    CLAUDE_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                json_response = response.json()
                
                # Extract generated content
                content = (
                    json_response.get("content", [{}])[0].get("text", "")
                    if isinstance(json_response.get("content"), list)
                    else ""
                )
                logger.info(f"Raw Response: {content}")

                # Clean the response - sometimes models add backticks or other text
                content = DeepseekAIClient._clean_json_response(content)
                
                # Parse as JSON and validate with the model
                try:
                    parsed_data = json.loads(DeepseekAIClient.extract_json_only(content))
                    logger.info(f"Parsed Data: {parsed_data}")
                    result = model_class.model_validate(parsed_data)
                    
                    # Store in cache
                    with DeepseekAIClient._cache_lock:
                        DeepseekAIClient._cache[cache_key] = CacheEntry(
                            data=result, 
                            ttl_seconds=cache_ttl
                        )
                    logger.debug(f"Cached response for {model_class.__name__}")
                    
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON: {e}")
                    logger.error(f"Invalid JSON content: {content}")
                    raise ValueError(f"Model returned invalid JSON: {e}")
                except Exception as e:
                    logger.error(f"Failed to validate model: {e}")
                    logger.error(f"Content: {content}")
                    raise ValueError(f"Failed to validate response against model: {e}")
                
        except Exception as e:
            logger.error(f"Error calling Deepseek API: {e}", exc_info=True)
            raise

    @staticmethod
    def _clean_json_response(content: str) -> str:
        """
        Clean a JSON response from the API with enhanced error handling:
        - Remove markdown code blocks
        - Remove any text before or after the JSON object
        - Attempt to repair malformed JSON (missing brackets)
        """
        # Remove markdown code blocks
        if content.startswith("```json"):
            content = content[7:]  # Remove ```json prefix
        if content.startswith("```"):
            content = content[3:]  # Remove ``` prefix
        if content.endswith("```"):
            content = content[:-3]  # Remove ``` suffix
        
        # Find JSON object boundaries
        start_idx = content.find('{')
        end_idx = content.rfind('}')
        
        if start_idx == -1 or end_idx == -1:
            return content.strip() 
        
        content = content[start_idx:end_idx+1]
        
        # Attempt to repair common malformations
        try:
            json.loads(content)
            return content
        except json.JSONDecodeError as e:
            logger.warning(f"JSON needs repair: {e}")

            if "Expecting ',' delimiter" in str(e) or "Expecting property name enclosed in double quotes" in str(e):
                last_valid_pos = content.rfind("}")
                if last_valid_pos > 0:
                    brace_count = 1
                    for i in range(last_valid_pos-1, 0, -1):
                        if content[i] == '}':
                            brace_count += 1
                        elif content[i] == '{':
                            brace_count -= 1
                        if brace_count == 0:
                            content = content[:last_valid_pos+1]
                            break
            
            # Case 1: Missing closing brackets for arrays/objects
            open_braces = content.count('{')
            close_braces = content.count('}')
            open_brackets = content.count('[')
            close_brackets = content.count(']')
            
            # Add missing closing brackets
            while open_braces > close_braces:
                content += '}'
                close_braces += 1
                
            while open_brackets > close_brackets:
                content += ']'
                close_brackets += 1
                
            try:
                json.loads(content)
                return content
            except json.JSONDecodeError:
                logger.error("Could not repair JSON, returning raw content")
                return content.strip()
       
    @staticmethod   
    def extract_json_only(text: str) -> str:
        json_match = regex.search(r'\{(?:[^{}]|(?R))*\}', text, regex.DOTALL)
        if json_match:
            return json_match.group(0)
        raise ValueError("No valid JSON object found in the text.")
import json
import re
from typing import Dict, Any, Optional

from app.external_service.redis_client import get_redis_client
from app.utils.logger import logger

class MetadataCache:
    def _compile_regex_patterns(self, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively traverses a dictionary and compiles any string
        value into a re.Pattern object.
        """
        compiled = {}
        for key, value in patterns.items():
            if isinstance(value, dict):
                compiled[key] = self._compile_regex_patterns(value)
            elif isinstance(value, str):
                try:
                    compiled[key] = re.compile(value, re.IGNORECASE)
                except re.error as e:
                    logger.warning(f"Could not compile regex for '{key}': {e}. Skipping.")
                    compiled[key] = None
            else:
                compiled[key] = value
        return compiled

    async def get_config(self, namespace: str) -> Optional[Dict[str, Any]]:
        """Fetches, parses, and prepares the complete metadata config from Redis."""
        try:
            redis_client = await get_redis_client()
            aliases_key = f"{namespace}:metadata:aliases"
            attributes_key = f"{namespace}:metadata:attributes"
            patterns_key = f"{namespace}:metadata:patterns"

            try:
                aliases_str, attributes_str, patterns_str = await redis_client.mget(
                    aliases_key, attributes_key, patterns_key
                )
            except Exception as e:
                logger.warning(f"Redis unavailable, using default metadata config: {e}")
                return {}

            if not all([aliases_str, attributes_str, patterns_str]):
                logger.info(f"Metadata config not found in Redis for '{namespace}'. Using fallback.")
                return None

            config = {
                "category_aliases": json.loads(aliases_str),
                "category_attributes": json.loads(attributes_str),
                "attribute_patterns": self._compile_regex_patterns(json.loads(patterns_str))
            }
            
            logger.info(f"Successfully loaded dynamic metadata config from Redis for '{namespace}'.")
            return config
            
        except Exception as e:
            logger.error(f"Failed to get or parse metadata config from Redis: {e}. Using fallback.", exc_info=True)
            return None

    async def store_config(self, namespace: str, config_data: Dict[str, Any]) -> None:
        """Validates and stores the generated metadata config into Redis."""
        try:
            category_aliases = config_data.get("CATEGORY_ALIASES", {})
            category_attributes = config_data.get("CATEGORY_ATTRIBUTES", {})
            attribute_patterns = config_data.get("ATTRIBUTE_PATTERNS", {})

            if not all([category_aliases, category_attributes, attribute_patterns]):
                logger.warning("Config data is missing one or more required keys. Skipping Redis storage.")
                return

            redis_client = await get_redis_client()
            
            async with redis_client.pipeline(transaction=True) as pipe:
                pipe.set(f"{namespace}:metadata:aliases", json.dumps(category_aliases))
                pipe.set(f"{namespace}:metadata:attributes", json.dumps(category_attributes))
                pipe.set(f"{namespace}:metadata:patterns", json.dumps(attribute_patterns))
                await pipe.execute()
            
            logger.info(f"Successfully stored metadata config in Redis for namespace: {namespace}")

        except Exception as e:
            logger.error(f"Failed to store metadata config in Redis: {e}", exc_info=True)
            raise RuntimeError(f"Redis storage failed for namespace '{namespace}': {e}") from e
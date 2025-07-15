import json
import re
import ast
from qdrant_client.http import models
from qdrant_client.http.models import SearchRequest, SearchParams
from pydantic import ValidationError
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional, Tuple, Set

from app.models.api.rag_pipeline import Vector, VectorMetadata
from app.utils.lru_cache import LRUCache
from app.utils.logger import logger

def extract_products_from_response(query_results: List[Any]) -> List[Dict[str, Any]]:
    """Extracts and filters products from query results."""
    products = []
    for result in query_results:
        if result and hasattr(result, 'metadata') and result.metadata:
            product_id = getattr(result, 'id', None)
            product = {
                "id": str(product_id) if product_id is not None else None,
                "name": getattr(result.metadata, 'title', None),
                "description": getattr(result.metadata, 'description', None),
                "price": getattr(result.metadata, 'price', None),
                "url": getattr(result.metadata, 'url', None),
                "image_url": getattr(result.metadata, 'image', None),
                "category": getattr(result.metadata, 'category', None),
                "variant_id": getattr(result.metadata, 'variant_id', None),
            }
            products.append(product)
    
    return [product for product in products if product["name"] and product["image_url"]]

def extract_categories(transformed_products):
    return list({str(p.get("category", "")) for p in transformed_products if p.get("category")})

def format_message_history(previous_messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Format previous messages for the agent's message history."""
    formatted_messages = []
    
    for msg in previous_messages:
        msg_type = msg.get('type', 'user')
        content = msg.get('content', '')

        if not content or content == "I'm an AI assistant. How can I help you 😊?":
            continue
        
        if msg_type == 'user':
            formatted_messages.append({
                "role": "user",
                "content": content
            })
        elif msg_type == 'bot':
            formatted_messages.append({
                "role": "assistant",
                "content": content
            })
    
    return formatted_messages

def safe_parse_json(text: str) -> Dict[str, Any]:
    """Safely parse JSON from text with multiple fallback strategies"""
    if not text or not text.strip():
        return {}
    
    text = text.strip()
    
    try:
        # Direct JSON parsing
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
        elif isinstance(parsed, str):
            # Handle double-encoded JSON
            return json.loads(parsed)
    except json.JSONDecodeError:
        pass
    
    try:
        # Extract from <result> tags
        if "<result>" in text and "</result>" in text:
            result_content = text.split("<result>")[-1].split("</result>")[0].strip()
            parsed = json.loads(result_content)
            if isinstance(parsed, dict):
                return parsed
    except json.JSONDecodeError:
        pass
    
    try:
        # JSON-like structure with regex
        json_pattern = r'\{(?:[^{}]|{[^{}]*})*\}'
        matches = re.findall(json_pattern, text, re.DOTALL)
        
        for match in matches:
            try:
                parsed = json.loads(match)
                if isinstance(parsed, dict) and ("answer" in parsed or "intent" in parsed):
                    return parsed
            except json.JSONDecodeError:
                continue
    except Exception:
        pass
    
    try:
        # Clean up common formatting issues
        cleaned_text = re.sub(r'\s+', ' ', text)
        cleaned_text = cleaned_text.replace('\n', '\\n')
        
        start_idx = cleaned_text.find('{')
        end_idx = cleaned_text.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = cleaned_text[start_idx:end_idx + 1]
            parsed = json.loads(json_str)
            if isinstance(parsed, dict):
                return parsed
    except Exception:
        pass
    
    # answer field contains nested JSON
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and "answer" in parsed:
            answer_content = parsed["answer"]
            if isinstance(answer_content, str) and answer_content.strip().startswith("{"):
                try:
                    inner_json = json.loads(answer_content)
                    if isinstance(inner_json, dict) and "answer" in inner_json:
                        return inner_json
                except json.JSONDecodeError:
                    pass
        return parsed
    except json.JSONDecodeError:
        pass
    
    return {}

def build_query_key(
    vector: List[float],
    namespace: Optional[str],
    metadata_filters: Optional[Dict[str, Any]],
    agent_type: Optional[str]
) -> str:
    return f"{','.join(f'{x:.6f}' for x in vector)}|{namespace}|{str(metadata_filters)}|{agent_type}"

def get_cache_results(
    cache: LRUCache,    
    vector: List[float],
    namespace: Optional[str],
    metadata_filters: Optional[Dict[str, Any]],
    agent_type: Optional[str]
) -> Tuple[Optional[List[Vector]], str]:
    query_key = build_query_key(vector, namespace, metadata_filters, agent_type)
    return cache.get(query_key), query_key

def normalize_vector(vector: List[float]) -> List[float]:
    norm = (sum(v ** 2 for v in vector)) ** 0.5
    return [v / norm for v in vector] if norm > 0 else vector

def build_query_filters(
    metadata_filters: Optional[Dict[str, Any]],
    namespace: Optional[str]
) -> List[models.Filter]:
    
    query_filters = []

    if metadata_filters:
        keys = list(metadata_filters.keys())
        values_lists = [
            metadata_filters[k] if isinstance(metadata_filters[k], list) else [metadata_filters[k]]
            for k in keys
        ]
        max_len = max(len(lst) for lst in values_lists)

        for i in range(max_len):
            must_conditions = []
            for key, values in zip(keys, values_lists):
                val = values[i] if i < len(values) else values[-1]

                if isinstance(val, dict) and any(k in val for k in ("$gte", "$lte", "$gt", "$lt")):
                    must_conditions.append(
                        models.FieldCondition(
                            key=key,
                            range=models.Range(
                                gte=int(Decimal(str(val.get("$gte"))).to_integral_value(rounding=ROUND_HALF_UP)) if val.get("$gte") is not None else None,
                                lte=int(Decimal(str(val.get("$lte"))).to_integral_value(rounding=ROUND_HALF_UP)) if val.get("$lte") is not None else None,
                                gt=int(Decimal(str(val.get("$gt"))).to_integral_value(rounding=ROUND_HALF_UP)) if val.get("$gt") is not None else None,
                                lt=int(Decimal(str(val.get("$lt"))).to_integral_value(rounding=ROUND_HALF_UP)) if val.get("$lt") is not None else None,
                            )
                        )
                    )
                elif key == "price" and isinstance(val, (int, float, Decimal)):
                    rounded_price = int(Decimal(str(val)).to_integral_value(rounding=ROUND_HALF_UP))
                    must_conditions.append(
                        models.FieldCondition(
                            key=key,
                            range=models.Range(gte=rounded_price, lte=rounded_price)
                        )
                    )
                else:
                    must_conditions.append(
                        models.FieldCondition(key=key, match=models.MatchValue(value=val))
                    )
            if namespace:
                must_conditions.append(models.FieldCondition(key="namespace", match=models.MatchValue(value=namespace)))
            query_filters.append(models.Filter(must=must_conditions))
    else:
        must_conditions = []
        if namespace:
            must_conditions.append(models.FieldCondition(key="namespace", match=models.MatchValue(value=namespace)))
        if must_conditions:
            query_filters.append(models.Filter(must=must_conditions))

    return query_filters

def prepare_search_requests(
    vector: List[float],
    filters: List[models.Filter],
    with_vector: bool,
    top_k: int
) -> List["SearchRequest"]:
    search_params = SearchParams(hnsw_ef=256, exact=False)
    return [
        SearchRequest(
            vector=vector,
            filter=f,
            with_payload=True,
            with_vector=with_vector,
            limit=top_k,
            params=search_params
        ) for f in filters
    ]

def parse_search_results(
    search_results: List[List[Any]],
    includes_values: bool,
    top_k: int,
    agent_type: Optional[str]
) -> List[Vector]:
    all_matches = [match for batch in search_results for match in batch]
    unique_matches = {match.id: match for match in all_matches}
    sorted_matches = sorted(unique_matches.values(), key=lambda x: x.score or 0.0, reverse=True)[:top_k]

    results = []
    for match in sorted_matches:
        payload = match.payload
        if not payload:
            continue
        try:
            results.append(
                Vector(
                    id=match.id,
                    values=match.vector if includes_values and match.vector else [],
                    metadata=VectorMetadata(**payload) if agent_type == "ProductAgent" else payload,
                    score=match.score
                )
            )
        except ValidationError as e:
            logger.error(f"Product validation failed: {e}")
    return results

def deduplicate_results_by_variant(results: List[Any]) -> List[Any]:
    """
    Deduplicates vector DB results based on `variant_id` or fallback to `id`.
    Returns a list of unique results.
    """
    unique_results = []
    seen_ids: Set[str] = set()

    for result in results:
        variant_id = getattr(result.metadata, 'variant_id', None)
        identifier = variant_id or result.id

        if identifier and identifier not in seen_ids:
            unique_results.append(result)
            seen_ids.add(identifier)

    return unique_results

def build_conversation_log_data(
    user_message: str,
    agent_response: Dict[str, Any],
    user_id: Optional[int],
    shop_id: int,
    is_guest: bool = False,
    guest_id: Optional[str] = None
) -> Dict[str, Any]:
    """Builds a dictionary for logging conversation data"""
    data = {
        "user_query": user_message,
        "agent_response": agent_response.get("answer"),
        "user_id": user_id,
        "shop_id": shop_id,
    }

    if is_guest:
        data["guest_id"] = guest_id

    return data
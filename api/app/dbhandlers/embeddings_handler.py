from typing import List, Optional, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import SearchRequest
from pydantic import ValidationError
from decimal import Decimal, ROUND_HALF_UP

from app.constants import QDRANT_COLLECTION_NAME
from app.config import QDRANT_API_URL, QDRANT_API_KEY
from app.models.api.rag_pipeline import ProductEmbedding, Vector, VectorMetadata
from app.utils.lru_cache import LRUCache
from app.utils.logger import logger

#TODO: If this LRU cache is important then we need to use redis, to create LRU cache for each store,
query_cache = LRUCache(capacity=100)

class EmbeddingsHandler:
    """Handles embedding storage and querying."""

    def __init__(self):
        self.client = QdrantClient(url=QDRANT_API_URL, api_key=QDRANT_API_KEY)
        self._ensure_collection_exists()

    def _ensure_collection_exists(self, vector_size: int = 1024):
        """Ensures the Qdrant collection exists, creates it if not."""
        if not self.client.collection_exists(collection_name=QDRANT_COLLECTION_NAME):
            self.client.create_collection(
                collection_name=QDRANT_COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )

    #TODO: Follow the naming convention like create_embeddings instead of store_embeddings
    async def store_embeddings(
        self, embeddings: List[ProductEmbedding], namespace: Optional[str]
    ) -> None:
        """Stores embeddings in the Qdrant collection."""
        points = []
        for embedding in embeddings:
            payload = embedding.metadata
            if namespace:
                payload["namespace"] = namespace
                
            points.append(models.PointStruct(
                id=embedding.id,
                vector=embedding.values,
                payload=payload
            ))

        self.client.upsert(
            collection_name=QDRANT_COLLECTION_NAME,
            points=points
        )
    
    #function should not be more than 50 lines, please create neccesaary reusable code by splitting properly, if you don't split properly error might come
    async def query_embeddings(
        self,
        vector: List[float],
        top_k: int = 5,
        namespace: Optional[str] = None,
        includes_values: bool = False,
        metadata_filters: Optional[Dict[str, Any]] = None,
        agent_type: Optional[str] = None
    ) -> List[Vector]:
        """Queries embeddings from Qdrant using hybrid search with namespace as primary filter."""

        #TODO: Seperate it, create a get cache module
        query_key = f"{','.join(f'{x:.6f}' for x in vector)}|{namespace}|{str(metadata_filters)}|{agent_type}"

        cached_result = self.get_cache_results(query_key)
        if cached_result:
            return cached_result
        
        if agent_type == "ProductAgent" and not metadata_filters:
            logger.info("Skipping query: No metadata filters provided for ProductAgent.")
            return []

        norm = (sum(value**2 for value in vector)) ** 0.5
        normalized_vector = [value / norm for value in vector] if norm > 0 else vector
        
        try:
            query_filters = []

            if metadata_filters:
                #TODO: Seperate it, create a function for this
                keys = list(metadata_filters.keys())
                values_lists = [
                    metadata_filters[k] if isinstance(metadata_filters[k], list) else [metadata_filters[k]]
                    for k in keys
                ]
                max_len = max(len(lst) for lst in values_lists)

                for i in range(max_len):
                    #TODO: What is happening here, very confusing, seperate different module properly, do these speration properly, efficently and scalablity
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
                        must_conditions.append(
                            models.FieldCondition(key="namespace", match=models.MatchValue(value=namespace))
                        )

                    query_filters.append(models.Filter(must=must_conditions))
            else:
                must_conditions = []
                if namespace:
                    must_conditions.append(
                        models.FieldCondition(key="namespace", match=models.MatchValue(value=namespace))
                    )
                if must_conditions:
                    query_filters.append(models.Filter(must=must_conditions))

            search_params = models.SearchParams(
                hnsw_ef=256,  # Higher = better recall (default: 128) 
                exact=False   # Using approximate search
            )

            search_requests = [
                SearchRequest(
                    vector=normalized_vector,
                    filter=q_filter,
                    with_payload=True,
                    with_vector=includes_values,
                    limit=top_k,
                    params=search_params
                ) for q_filter in query_filters
            ]

            search_results = self.client.search_batch(
                collection_name=QDRANT_COLLECTION_NAME,
                requests=search_requests
            )

            all_matches = []
            for match_batch in search_results:
                all_matches.extend(match_batch)

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

            query_cache.put(query_key, results)
            return results
        except Exception as e:
            logger.error("Error querying Qdrant: %s", str(e), exc_info=True)
            return []

    def get_cache_results(self, query_key: str) -> Optional[List[Vector]]:
        """Fetch results from query cache using the query key."""
        return query_cache.get(query_key)    
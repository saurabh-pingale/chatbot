from typing import List, Optional, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.constants import QDRANT_COLLECTION_NAME
from app.config import QDRANT_API_URL, QDRANT_API_KEY
from app.models.api.rag_pipeline import ProductEmbedding, Vector
from app.utils.lru_cache import AsyncRedisLRUCache
from app.utils.rag_pipeline_utils import (
    get_cache_results,
    normalize_vector, 
    build_query_filters, 
    prepare_search_requests,
    parse_search_results
)
from app.utils.logger import logger

class EmbeddingsHandler:
    """Handles embedding storage and querying."""

    def __init__(self):
        self.client = QdrantClient(url=QDRANT_API_URL, api_key=QDRANT_API_KEY)
        self._ensure_collection_exists()
        self.cache = None

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

    async def create_embeddings(
        self, embeddings: List[ProductEmbedding], namespace: Optional[str]
    ) -> None:
        """Create embeddings in the Qdrant collection."""
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
        
    async def get_embeddings(
        self,
        vector: List[float],
        top_k: int = 5,
        namespace: Optional[str] = None,
        includes_values: bool = False,
        metadata_filters: Optional[Dict[str, Any]] = None,
        agent_type: Optional[str] = None
    ) -> List[Vector]:
        """Queries embeddings from Qdrant using hybrid search with namespace as primary filter."""

        if self.cache is None:
            self.cache = await AsyncRedisLRUCache.create(capacity=100)

        cached_result, query_key = await get_cache_results(
            self.cache, vector, namespace, metadata_filters, agent_type
        )
        if cached_result:
            return [Vector(**item) for item in cached_result]
        
        if agent_type == "ProductAgent" and not metadata_filters:
            logger.info("Skipping query: No metadata filters provided for ProductAgent.")
            return []
        
        normalized_vector = normalize_vector(vector)
        
        try:
            query_filters = build_query_filters(metadata_filters, namespace)

            search_requests = prepare_search_requests(
                normalized_vector,
                query_filters, 
                includes_values, 
                top_k
            )

            search_results = self.client.search_batch(
                collection_name=QDRANT_COLLECTION_NAME,
                requests=search_requests
            )

            results = parse_search_results(search_results, includes_values, top_k, agent_type)

            await self.cache.put(query_key, [r.dict() for r in results])
            return results
        except Exception as e:
            logger.error("Error querying Qdrant: %s", str(e), exc_info=True)
            return []
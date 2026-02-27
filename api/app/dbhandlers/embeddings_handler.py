from typing import List, Optional, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
import asyncio

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
    _client = None

    def __init__(self):
        if EmbeddingsHandler._client is None:
            EmbeddingsHandler._client = QdrantClient(url=QDRANT_API_URL, api_key=QDRANT_API_KEY)
        self.client = EmbeddingsHandler._client
        self.collection = QDRANT_COLLECTION_NAME
        self._ensure_collection_exists()
        self.cache = None

    def _ensure_collection_exists(self, vector_size: int = 384):
        """Ensures the Qdrant collection exists, creates it if not."""
        if not self.client.collection_exists(collection_name=self.collection):
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
            self.client.create_payload_index(
                collection_name=self.collection,
                field_name="namespace",
                field_schema="keyword"
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
        #TODO P0: Are we creating storing cache object in DB as a backup?
        #TODO P0: There might be duplicate so are we updating by replacing cache with new data?
        #Are we storing the updated(upsert) data in cache??
        if self.cache is None:
            self.cache = await AsyncRedisLRUCache.create(capacity=100)

        cached_result, query_key = await get_cache_results(
            self.cache, vector, namespace, metadata_filters, agent_type
        )
        if cached_result:
            return [Vector(**item) for item in cached_result]
        
        normalized_vector = normalize_vector(vector)
        
        try:
            query_filters = build_query_filters(metadata_filters, namespace)

            search_requests = prepare_search_requests(
                normalized_vector,
                query_filters, 
                includes_values, 
                top_k
            )

            search_results = await asyncio.to_thread(
                self.client.search_batch,
                collection_name=QDRANT_COLLECTION_NAME,
                requests=search_requests
            )

            results = parse_search_results(search_results, includes_values, top_k, agent_type)

            await self.cache.put(query_key, [r.dict() for r in results])
            return results
        except Exception as e:
            logger.error("Error querying Qdrant: %s", str(e), exc_info=True)
            return []
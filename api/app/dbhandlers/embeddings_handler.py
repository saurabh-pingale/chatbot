from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from app.constants import QDRANT_COLLECTION_NAME
from app.config import QDRANT_API_URL, QDRANT_API_KEY
from app.models.api.rag_pipeline import ProductEmbedding, Vector, VectorMetadata
from app.utils.logger import logger

class EmbeddingsHandler:
    """Handles embedding storage and querying."""

    def __init__(self):
        self.client = QdrantClient(url=QDRANT_API_URL, api_key=QDRANT_API_KEY)

    def _create_collection(self, vector_size: int = 1024):
        """Creates a collection if it doesn't exist."""
        self.client.create_collection(
            collection_name=QDRANT_COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=vector_size,
                distance=models.Distance.COSINE
            )
        )

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

    async def query_embeddings(
        self,
        vector: List[float],
        top_k: int = 10,
        namespace: Optional[str] = None,
        includes_values: bool = False,
    ) -> List[Vector]:
        """Queries embeddings from the Qdrant collection."""
        norm = (sum(value**2 for value in vector)) ** 0.5
        normalized_vector = [value / norm for value in vector] if norm > 0 else vector

        try:
            filter_condition = None
            if namespace:
                filter_condition = models.Filter(
                    must=[
                        models.FieldCondition(
                            key="namespace",
                            match=models.MatchValue(value=namespace)
                        )
                    ]
                )

            search_results = self.client.search(
                collection_name=QDRANT_COLLECTION_NAME,
                query_vector=normalized_vector,
                limit=top_k,
                with_payload=True,
                with_vectors=includes_values,
                filter=filter_condition
            )

            results = []
            for match in search_results:
                payload = match.payload
                if not payload:
                    continue

                results.append(
                    Vector(
                        id=str(match.id),
                        values=match.vector if includes_values and match.vector else [],
                        metadata=VectorMetadata(**payload)
                    )
                )

            return results
        except Exception as e:
            logger.error("Error querying Qdrant: %s", str(e), exc_info=True)
            return []

    
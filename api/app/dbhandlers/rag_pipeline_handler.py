from typing import List, Optional
from app.constants import PC, PC_INDEX_NAME
from app.models.api.rag_pipeline import ProductEmbedding, Vector, VectorMetadata

class RagPipelineHandler:
    """Handles embedding storage and querying."""

    def __init__(self):
        self.index = PC.Index(PC_INDEX_NAME)

    async def store_embeddings(
        self, embeddings: List[ProductEmbedding], namespace: Optional[str]
    ) -> None:
        """Stores embeddings in the index."""
        vectors = [
            {
                "id": embedding.id,
                "values": embedding.values,
                "metadata": embedding.metadata,
            }
            for embedding in embeddings
        ]
        self.index.upsert(vectors=vectors, namespace=namespace)

    async def query_embeddings(
        self,
        vector: List[float],
        top_k: int = 10,
        namespace: Optional[str] = None,
        includes_values: bool = False,
    ) -> List[Vector]:
        """Queries embeddings from the index."""
        norm = (sum(value**2 for value in vector)) ** 0.5
        normalized_vector = [value / norm for value in vector] if norm > 0 else vector

        try:
            results = self.index.query(
                vector=normalized_vector,
                top_k=top_k,
                include_metadata=True,
                includes_values=includes_values,
                namespace=namespace,
            )

            return [
                Vector(
                    id=match["id"],
                    values=match.get("values", []),
                    metadata=(
                        VectorMetadata(**match["metadata"])
                        if match.get("metadata")
                        else None
                    ),
                )
                for match in results["matches"]
                if match.get("metadata")
            ]
        except Exception as e:
            print(f"Error querying Pinecone: {e}")
            return []

    
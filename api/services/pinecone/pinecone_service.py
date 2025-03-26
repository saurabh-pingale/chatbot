import os
from pinecone import Pinecone
from dotenv import load_dotenv
from typing import List, Optional
from schemas.models import ProductEmbedding, Vector, VectorMetadata

load_dotenv()

try:
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
except KeyError:
    raise RuntimeError("PINECONE_API_KEY environment variable not set")

INDEX_NAME = 'chatbot'

async def store_embeddings(embeddings: List[ProductEmbedding], namespace: Optional[str]) -> None:
    index = pc.Index(INDEX_NAME)
    
    vectors = [
        {
            "id": emb.id,
            "values": emb.values,
            "metadata": emb.metadata
        }
        for emb in embeddings
    ]
    
    index.upsert(vectors=vectors, namespace=namespace)

async def query_embeddings(
        vector: List[float], 
        top_k: int = 10, 
        namespace: Optional[str] = None,
        includes_values: bool = False
    ) -> List[Vector]:

    index = pc.Index(INDEX_NAME)
        
    norm = (sum(val ** 2 for val in vector)) ** 0.5
    normalized_vector = [val / norm for val in vector] if norm > 0 else vector

    try:
        results = index.query(
            vector=normalized_vector,
            top_k=top_k,
            include_metadata=True,
            includes_values=includes_values,
            namespace=namespace
        )
        
        return [
            Vector(
                id=match["id"],
                values=match.get("values", []),
                metadata=VectorMetadata(**match["metadata"]) if match.get('metadata') else None
            )
            for match in results["matches"]
            if match.get('metadata')
        ]
    except Exception as e:
        print(f"Error querying Pinecone: {e}")
        return []
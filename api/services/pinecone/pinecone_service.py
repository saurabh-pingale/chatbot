import os
from pinecone import Pinecone
from dotenv import load_dotenv
from typing import List
from schemas.models import ProductEmbedding, Vector, VectorMetadata

load_dotenv()

try:
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
except KeyError:
    raise RuntimeError("PINECONE_API_KEY environment variable not set")

INDEX_NAME = 'chatbot'

async def store_embeddings(embeddings: List[ProductEmbedding]) -> None:
    index = pc.Index(INDEX_NAME)
    
    vectors = [
        {
            "id": emb.id,
            "values": emb.values,
            "metadata": emb.metadata
        }
        for emb in embeddings
    ]
    
    index.upsert(vectors=vectors)

async def query_embeddings(vector: List[float], top_k: int = 10) -> List[Vector]:
    index = pc.Index(INDEX_NAME)
    
    norm = (sum(val ** 2 for val in vector)) ** 0.5
    normalized_vector = [val / norm for val in vector]
    
    results = index.query(
        vector=normalized_vector,
        top_k=top_k,
        include_metadata=True
    )
    
    return [
        Vector(
            id=match["id"],
            values=match.get("values", []),
            metadata=VectorMetadata(**match["metadata"])
        )
        for match in results["matches"]
    ]
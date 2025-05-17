import numpy as np
from FlagEmbedding import FlagModel
from typing import List, Optional, Dict, Any

from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.vector_utils import pad_vector

class EmbeddingService:
    model = FlagModel(
        'BAAI/bge-small-en-v1.5',
        query_instruction_for_retrieval="Represent this sentence for searching relevant passages:",
        use_fp16=False 
    )

    @staticmethod
    def create_embeddings(text: str | List[str]) -> List[float] | List[List[float]]:
        if isinstance(text, str):
            embedding = EmbeddingService.model.encode(text)
            embedding = np.array(embedding)

            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            return pad_vector(embedding.tolist(), 1024)

        elif isinstance(text, list):
            embeddings = EmbeddingService.model.encode(text)
            embeddings = np.array(embeddings)

            padded_embeddings = []
            for emb in embeddings:
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                padded_embeddings.append(pad_vector(emb.tolist(), 1024))

        return padded_embeddings

    @staticmethod
    async def get_embeddings(
        vector: List[float], 
        top_k: int = 10, 
        namespace: Optional[str] = None, 
        includes_values: bool = False,
        metadata_filters: Optional[Dict[str, Any]] = None,
        agent_type: Optional[str] = None
        ):
        embeddings_handler = EmbeddingsHandler()
        return await embeddings_handler.query_embeddings(
            vector=vector,
            top_k=top_k,
            namespace=namespace,
            includes_values=includes_values,
            metadata_filters=metadata_filters,
            agent_type=agent_type
        )
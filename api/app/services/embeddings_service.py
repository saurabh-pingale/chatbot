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
    def create_embeddings(text: str) -> List[float]:
        embeddings = EmbeddingService.model.encode(text)
        embeddings = np.array(embeddings)

        norm = np.linalg.norm(embeddings)
        if norm > 0:
            embeddings = embeddings / norm 

        return pad_vector(embeddings.tolist(), 1024)

    @staticmethod
    async def get_embeddings(
        vector: List[float], 
        top_k: int = 10, 
        namespace: Optional[str] = None, 
        includes_values: bool = False,
        metadata_filters: Optional[Dict[str, Any]] = None,
        ):
        embeddings_handler = EmbeddingsHandler()
        return await embeddings_handler.query_embeddings(
            vector=vector,
            top_k=top_k,
            namespace=namespace,
            includes_values=includes_values,
            metadata_filters=metadata_filters
        )
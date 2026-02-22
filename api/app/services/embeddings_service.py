import numpy as np
from FlagEmbedding import FlagModel
from typing import List, Optional, Dict, Any
import os

import app.config as app_config
from app.config import DEV_MODE, EMBEDDING_MODEL_LOCAL_PATH, EMBEDDING_MODEL_NAME, EMBEDDING_MODEL_PATH
from app.dbhandlers.embeddings_handler import EmbeddingsHandler
from app.utils.vector_utils import pad_vector

class EmbeddingService:
    """
    EmbeddingService with lazy model loading.
    The model will only be loaded the first time it's used,
    which avoids long startup times on Cloud Run.
    """

    _model = None 

    @classmethod
    def get_model(cls) -> FlagModel:
        """Lazily load and return the embedding model."""
        if cls._model is None:
            if not DEV_MODE:
                model_path = os.path.join(EMBEDDING_MODEL_PATH, EMBEDDING_MODEL_NAME)
            else:
                api_root = os.path.dirname(os.path.dirname(os.path.abspath(app_config.__file__)))
                local_path = os.path.normpath((EMBEDDING_MODEL_LOCAL_PATH or "").strip())
                model_path = os.path.abspath(os.path.join(api_root, local_path))
            assert os.path.isdir(model_path), f"Model directory not found: {model_path}"
            cls._model = FlagModel(
                model_path,
                query_instruction_for_retrieval="Represent this sentence for searching relevant passages:",
                use_fp16=False
            )
        return cls._model

    @classmethod
    def create_embeddings(cls, text: str | List[str]) -> List[float] | List[List[float]]:
        model = cls.get_model()  # load model only when needed

        if isinstance(text, str):
            embedding = model.encode(text)
            embedding = np.array(embedding)

            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm

            return pad_vector(embedding.tolist(), 1024)

        elif isinstance(text, list):
            embeddings = model.encode(text)
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
        return await embeddings_handler.get_embeddings(
            vector=vector,
            top_k=top_k,
            namespace=namespace,
            includes_values=includes_values,
            metadata_filters=metadata_filters,
            agent_type=agent_type
        )
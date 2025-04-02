import numpy as np
from transformers import pipeline
from typing import List
from utils.vector_utils import pad_vector

extractor = pipeline(
    "feature-extraction", 
    model="sentence-transformers/all-MiniLM-L6-v2", 
    device="cpu"
)

#TODO - Have doubt will sit and refactor
async def generate_embeddings(text: str) -> List[float]:
    output = extractor(text, pooling="mean", normalize=True)

    if hasattr(output, 'tolist'):
        embeddings = output.tolist()
    else:
        embeddings = output[0] if isinstance(output, list) else output

    if isinstance(embeddings, list) and isinstance(embeddings[0], list):
        embeddings = embeddings[0]

    embeddings = np.array(embeddings)
    
    norm = np.linalg.norm(embeddings)
    if norm > 0:
        embeddings = embeddings / norm 
    
    return pad_vector(embeddings.tolist(), 1024)
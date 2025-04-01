# import numpy as np
# from FlagEmbedding import FlagModel
# from typing import List
# from app.utils.vector_utils import pad_vector

# model = FlagModel(
#     'BAAI/bge-small-en-v1.5',
#     query_instruction_for_retrieval="Represent this sentence for searching relevant passages:",
#     use_fp16=False 
# )

# async def generate_embeddings(text: str) -> List[float]:
#     embeddings = model.encode(text)
    
#     embeddings = np.array(embeddings)
    
#     norm = np.linalg.norm(embeddings)
#     if norm > 0:
#         embeddings = embeddings / norm 
    
#     return pad_vector(embeddings.tolist(), 1024)
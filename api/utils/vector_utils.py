from typing import List

def pad_vector(vector: List[float], target_dimension: int) -> List[float]:
    if len(vector) >= target_dimension:
        return vector[:target_dimension]
    return vector + [0.0] * (target_dimension - len(vector))
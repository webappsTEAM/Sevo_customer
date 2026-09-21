import math
import re
import hashlib
from typing import List, Optional


class Embedder:
    """
    Computes text embeddings and cosine similarity.
    Uses deterministic term-frequency hashing (128 dimensions) for zero-dependency,
    fast, consistent offline vector similarity across all environments.
    """
    VECTOR_DIM = 128

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        clean_text = (text or "").lower()
        tokens = re.findall(r"\b[a-z0-9_]{2,}\b", clean_text)
        if not tokens:
            return [0.0] * cls.VECTOR_DIM

        vector = [0.0] * cls.VECTOR_DIM
        for token in tokens:
            # Deterministic hash to bucket
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % cls.VECTOR_DIM
            vector[idx] += 1.0

        # L2 normalization
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [round(x / norm, 5) for x in vector]
        return vector

    @classmethod
    def cosine_similarity(cls, v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, dot_product))

import os
import math
import re
import hashlib
import logging
from typing import List, Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class Embedder:
    """
    Computes text embeddings and cosine similarity using Google's semantic embedding model.
    Uses gemini-embedding-001 with outputDimensionality=768 (MRL) for state-of-the-art
    semantic understanding across home services, policies, and logistics.
    """
    MODEL_NAME = "gemini-embedding-001"
    VECTOR_DIM = 768
    API_TIMEOUT = 12

    @classmethod
    def _get_api_key(cls) -> str:
        return getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")

    @classmethod
    def _normalize(cls, vec: List[float]) -> List[float]:
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            return [round(x / norm, 6) for x in vec]
        return [0.0] * cls.VECTOR_DIM

    @classmethod
    def _fallback_embedding(cls, text: str) -> List[float]:
        """
        Deterministic 768-dim term-frequency hashing fallback if external API is unreachable or in offline test mode.
        """
        clean_text = (text or "").lower()
        tokens = re.findall(r"\b[a-z0-9_]{2,}\b", clean_text)
        if not tokens:
            return [0.0] * cls.VECTOR_DIM

        vector = [0.0] * cls.VECTOR_DIM
        for token in tokens:
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % cls.VECTOR_DIM
            vector[idx] += 1.0

        return cls._normalize(vector)

    @classmethod
    def get_embedding(cls, text: str, retries: int = 2) -> List[float]:
        """
        Generates a 768-dimensional semantic embedding for a text query or document.
        Handles Google API 429 rate-limiting with automatic backoff.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            return [0.0] * cls.VECTOR_DIM

        api_key = cls._get_api_key()
        if not api_key:
            logger.debug("GEMINI_API_KEY not found. Using fallback embedding.")
            return cls._fallback_embedding(clean_text)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cls.MODEL_NAME}:embedContent?key={api_key}"
        payload = {
            "content": {"parts": [{"text": clean_text[:2048]}]},
            "outputDimensionality": cls.VECTOR_DIM,
        }

        for attempt in range(retries + 1):
            try:
                resp = requests.post(url, json=payload, timeout=cls.API_TIMEOUT)
                if resp.status_code == 200:
                    vals = resp.json().get("embedding", {}).get("values", [])
                    if vals and len(vals) == cls.VECTOR_DIM:
                        return cls._normalize(vals)
                elif resp.status_code == 429 and attempt < retries:
                    wait_time = 15 + (attempt * 10)
                    logger.info("Gemini embedContent rate-limited (429). Retrying in %d seconds...", wait_time)
                    import time
                    time.sleep(wait_time)
                    continue
                else:
                    logger.warning("Gemini embedContent API returned status %d: %s. Using fallback.", resp.status_code, resp.text[:120])
            except Exception as exc:
                logger.warning("Network exception calling Gemini embedContent: %s. Using fallback.", exc)

        return cls._fallback_embedding(clean_text)

    @classmethod
    def get_embeddings_batch(cls, texts: List[str], batch_size: int = 20) -> List[List[float]]:
        """
        Generates 768-dimensional semantic embeddings in batches using batchEmbedContents.
        Respects Google Free Tier RPM quotas (100 req/min) with pacing and 429 retry backoff.
        """
        import time

        if not texts:
            return []

        api_key = cls._get_api_key()
        if not api_key:
            return [cls._fallback_embedding(t) for t in texts]

        results: List[List[float]] = []
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{cls.MODEL_NAME}:batchEmbedContents?key={api_key}"

        for i in range(0, len(texts), batch_size):
            chunk_texts = texts[i:i + batch_size]
            req_items = []
            for t in chunk_texts:
                clean_t = (t or "").strip()[:2048]
                req_items.append({
                    "model": f"models/{cls.MODEL_NAME}",
                    "content": {"parts": [{"text": clean_t or "CalServices"}]},
                    "outputDimensionality": cls.VECTOR_DIM,
                })

            batch_succeeded = False
            for attempt in range(3):
                try:
                    resp = requests.post(url, json={"requests": req_items}, timeout=25)
                    if resp.status_code == 200:
                        embeddings = resp.json().get("embeddings", [])
                        if len(embeddings) == len(chunk_texts):
                            for emb in embeddings:
                                vals = emb.get("values", [])
                                results.append(cls._normalize(vals))
                            batch_succeeded = True
                            # Small pace between batches to respect RPM
                            time.sleep(1.0)
                            break
                    elif resp.status_code == 429:
                        wait_time = 22 + (attempt * 10)
                        logger.warning("Google embedding quota reached (429). Waiting %d seconds for window reset...", wait_time)
                        time.sleep(wait_time)
                        continue
                    else:
                        logger.warning("batchEmbedContents status %d: %s.", resp.status_code, resp.text[:120])
                        break
                except Exception as exc:
                    logger.warning("Network exception in batchEmbedContents: %s.", exc)
                    time.sleep(3)

            if not batch_succeeded:
                # Fallback item-by-item for this chunk
                for t in chunk_texts:
                    results.append(cls.get_embedding(t))

        return results

    @classmethod
    def cosine_similarity(cls, v1: List[float], v2: List[float]) -> float:
        """
        Computes cosine similarity between two normalized vectors.
        """
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot_product = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, dot_product))

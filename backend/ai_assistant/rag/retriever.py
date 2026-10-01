import re
from typing import List, Dict, Any, Optional
from ai_assistant.models import KnowledgeChunk
from ai_assistant.rag.embedder import Embedder

STOPWORDS = {
    "what", "whats", "what's", "is", "are", "was", "were", "the", "a", "an",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "about",
    "how", "can", "could", "should", "would", "do", "does", "did", "have", "has",
    "i", "me", "my", "we", "you", "your", "they", "them", "their", "it", "its",
    "and", "or", "but", "so", "if", "included", "including", "please", "tell",
    "want", "know", "there", "this", "that", "any", "some",
    "hi", "hello", "hey", "am", "im", "i'm", "name", "myself", "good",
    "morning", "afternoon", "evening", "who", "whom", "whose"
}


class KnowledgeRetriever:
    """
    Pure semantic embedding retriever using vector cosine similarity
    over verified KnowledgeChunk records.
    Uses Google's 768-dimensional semantic embeddings (gemini-embedding-001)
    to match meaning rather than keywords or substring matches.
    """

    @classmethod
    def retrieve(cls, query: str, top_k: int = 3, min_score: float = 0.12) -> List[Dict[str, Any]]:
        clean_q = (query or "").strip()
        if not clean_q:
            return []

        query_vec = Embedder.get_embedding(clean_q)

        # 1. Fetch candidate chunks
        chunks = KnowledgeChunk.objects.all()
        if not chunks.exists():
            return []

        scored_results = []

        for chunk in chunks:
            # Pure semantic vector cosine similarity
            vec_sim = Embedder.cosine_similarity(query_vec, chunk.embedding or [])

            if vec_sim >= min_score:
                scored_results.append({
                    "chunk_id": chunk.id,
                    "source_id": chunk.source_id,
                    "category": chunk.source_category,
                    "title": chunk.title,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                    "score": round(vec_sim, 3),
                    "vec_sim": round(vec_sim, 3),
                })

        # Sort descending by semantic similarity score
        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

    @classmethod
    def format_context(cls, retrieved_chunks: List[Dict[str, Any]]) -> str:
        """
        Formats retrieved knowledge into clear system context with citations.
        """
        if not retrieved_chunks:
            return ""

        context_lines = ["--- VERIFIED KNOWLEDGE BASE CONTEXT ---"]
        for idx, item in enumerate(retrieved_chunks, 1):
            context_lines.append(f"[{idx}] {item['title']} (Source: {item['source_id']}):")
            context_lines.append(item["content"])
            context_lines.append("")
        context_lines.append("--- END KNOWLEDGE CONTEXT ---")
        return "\n".join(context_lines)


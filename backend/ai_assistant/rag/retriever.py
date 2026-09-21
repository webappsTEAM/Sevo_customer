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
    "want", "know", "there", "this", "that", "any", "some"
}


class KnowledgeRetriever:
    """
    Hybrid retriever combining text matching and vector cosine similarity
    over verified KnowledgeChunk records.
    Uses Google's semantic embeddings + content-bearing token matching for accurate ranking.
    """

    @classmethod
    def retrieve(cls, query: str, top_k: int = 3, min_score: float = 0.38) -> List[Dict[str, Any]]:
        clean_q = (query or "").strip()
        if not clean_q:
            return []

        query_vec = Embedder.get_embedding(clean_q)

        # 1. Fetch candidate chunks
        chunks = KnowledgeChunk.objects.all()
        if not chunks.exists():
            return []

        # Extract content-bearing tokens, removing generic stopwords
        all_tokens = re.findall(r"\b[a-z0-9_]{2,}\b", clean_q.lower())
        informative_tokens = [t for t in all_tokens if t not in STOPWORDS]

        scored_results = []

        for chunk in chunks:
            # Vector cosine similarity
            vec_sim = Embedder.cosine_similarity(query_vec, chunk.embedding or [])

            # Text keyword match score with title boosting
            content_lower = chunk.content.lower()
            title_lower = chunk.title.lower()

            if informative_tokens:
                title_hits = sum(1 for t in informative_tokens if t in title_lower)
                content_hits = sum(1 for t in informative_tokens if t in content_lower)
                raw_text_score = (2.5 * title_hits + 1.0 * content_hits) / max(1.0, 2.5 * len(informative_tokens))
                text_score = min(1.0, raw_text_score)
                composite_score = 0.4 * text_score + 0.6 * vec_sim
            else:
                text_score = 0.0
                composite_score = vec_sim

            # Filter out weak matches: must meet composite threshold and demonstrate genuine relevance
            is_relevant = (composite_score >= min_score and (vec_sim >= 0.52 or text_score >= 0.30))

            if is_relevant:
                scored_results.append({
                    "chunk_id": chunk.id,
                    "source_id": chunk.source_id,
                    "category": chunk.source_category,
                    "title": chunk.title,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                    "score": round(composite_score, 3),
                    "vec_sim": round(vec_sim, 3),
                    "text_score": round(text_score, 3),
                })

        # Sort descending by composite score
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


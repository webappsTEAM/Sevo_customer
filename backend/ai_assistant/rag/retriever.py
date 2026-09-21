from typing import List, Dict, Any, Optional
from django.db.models import Q
from ai_assistant.models import KnowledgeChunk
from ai_assistant.rag.embedder import Embedder


class KnowledgeRetriever:
    """
    Hybrid retriever combining text matching and vector cosine similarity
    over verified KnowledgeChunk records.
    """

    @classmethod
    def retrieve(cls, query: str, top_k: int = 3, min_score: float = 0.15) -> List[Dict[str, Any]]:
        clean_q = (query or "").strip()
        if not clean_q:
            return []

        query_vec = Embedder.get_embedding(clean_q)

        # 1. Fetch candidate chunks
        chunks = KnowledgeChunk.objects.all()
        if not chunks.exists():
            return []

        scored_results = []
        tokens = [t.lower() for t in clean_q.split() if len(t) > 2]

        for chunk in chunks:
            # Vector similarity
            vec_sim = Embedder.cosine_similarity(query_vec, chunk.embedding or [])

            # Text keyword match score
            content_lower = chunk.content.lower()
            title_lower = chunk.title.lower()
            kw_hits = sum(1 for t in tokens if t in content_lower or t in title_lower)
            text_score = min(1.0, kw_hits / max(1, len(tokens)))

            # Hybrid score (weighted combination)
            composite_score = 0.4 * text_score + 0.6 * vec_sim

            if composite_score >= min_score or (text_score > 0.4):
                scored_results.append({
                    "chunk_id": chunk.id,
                    "source_id": chunk.source_id,
                    "category": chunk.source_category,
                    "title": chunk.title,
                    "content": chunk.content,
                    "metadata": chunk.metadata,
                    "score": round(composite_score, 3),
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

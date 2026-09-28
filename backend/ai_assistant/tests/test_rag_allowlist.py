from django.test import TestCase
from ai_assistant.rag.allowlist import KnowledgeAllowlist, DisallowedKnowledgeSourceError
from ai_assistant.rag.retriever import KnowledgeRetriever
from ai_assistant.models import KnowledgeChunk, KnowledgeCategory


class RAGAllowlistTests(TestCase):
    def test_legacy_repo_docs_are_strictly_rejected(self):
        """
        CalServices Rule #7:
        CLAUDE.md, README.md, ARCHITECTURE.md, API.md, DATABASE.md must raise DisallowedKnowledgeSourceError.
        """
        disallowed = [
            "CLAUDE.md",
            "README.md",
            "ARCHITECTURE.md",
            "API.md",
            "DATABASE.md",
            "path/to/claude.md",
        ]

        for doc in disallowed:
            with self.assertRaises(DisallowedKnowledgeSourceError):
                KnowledgeAllowlist.validate_file_path(doc)

    def test_approved_policy_sources_pass_validation(self):
        """Canonical policy sources pass validation."""
        approved = [
            "CancellationRefundPage.jsx",
            "ServiceDeliveryPage.jsx",
            "policy:cancellation_refund",
            "package:ac-regular-service",
        ]
        for src in approved:
            try:
                KnowledgeAllowlist.validate_file_path(src)
            except DisallowedKnowledgeSourceError:
                self.fail(f"Approved source '{src}' was unexpectedly rejected.")

    def test_rag_retrieval_returns_relevant_policy(self):
        """KnowledgeRetriever finds cancellation policy when queried."""
        # Ensure policy exists in test DB
        KnowledgeChunk.objects.create(
            source_id="policy:cancellation_refund",
            source_category=KnowledgeCategory.POLICY,
            title="Cancellation and Refund Policy",
            content="You can cancel free of charge if cancelled more than 2 hours before the scheduled appointment slot.",
            embedding=Embedder.get_embedding("Cancellation and Refund Policy cancel free of charge appointment slot"),
        )

        results = KnowledgeRetriever.retrieve("What is the cancellation policy?", top_k=2)
        self.assertTrue(len(results) > 0)
        top_result = results[0]
        self.assertIn("Cancellation", top_result["title"])

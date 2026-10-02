from django.test import TestCase
from ai_assistant.models import KnowledgeChunk, KnowledgeCategory
from ai_assistant.rag.retriever import KnowledgeRetriever
from ai_assistant.rag.embedder import Embedder


class SemanticRetrievalTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create representative test chunks with embeddings
        cls.ac_foam_jet = KnowledgeChunk.objects.create(
            source_id="package:foam-power-jet-split",
            source_category=KnowledgeCategory.PACKAGE,
            title="Package Scope: Foam & Power Jet AC Service - Split",
            content="Foam & Power Jet AC Service covers deep coil cleaning using high pressure jet pump, indoor filter sanitization, outdoor condenser wash, and gas leak check.",
            embedding=Embedder.get_embedding("Foam & Power Jet AC Service - Split deep coil cleaning jet pump filter wash"),
        )

        cls.bathroom_tile = KnowledgeChunk.objects.create(
            source_id="package_faq:bathroom-tile-fixing:1",
            source_category=KnowledgeCategory.FAQ,
            title="FAQ: What materials are included? (Bathroom Tile Fixing)",
            content="Question: What materials are included? Answer: Standard cement and white cement grout are included. Applicable Package: Bathroom Tile Fixing",
            embedding=Embedder.get_embedding("What materials are included? Bathroom Tile Fixing cement grout"),
        )

        cls.cancellation_policy = KnowledgeChunk.objects.create(
            source_id="policy:cancellation_refund",
            source_category=KnowledgeCategory.POLICY,
            title="Cancellation, Refund & Rework Guarantee Policy",
            content="Customers may cancel free of charge up to 2 hours before the scheduled appointment slot. Rescheduling is free of charge.",
            embedding=Embedder.get_embedding("Cancellation, Refund & Rework Guarantee Policy cancel free of charge appointment slot"),
        )

        cls.gst_policy = KnowledgeChunk.objects.create(
            source_id="policy:pricing_and_payment",
            source_category=KnowledgeCategory.POLICY,
            title="Pricing, GST & Payment Policy",
            content="All service prices include applicable 18% GST. A platform safety and technology fee of Rs 29 is charged per booking.",
            embedding=Embedder.get_embedding("Pricing, GST & Payment Policy GST 18 percent platform safety fee Rs 29"),
        )

        cls.shifting_package = KnowledgeChunk.objects.create(
            source_id="package:2bhk-3bhk-shifting",
            source_category=KnowledgeCategory.PACKAGE,
            title="Package Scope: 2 BHK / 3 BHK Household Shifting",
            content="Includes packing of all furniture, loading into closed container vehicle, transportation to destination, unloading and placement.",
            embedding=Embedder.get_embedding("2 BHK / 3 BHK Household Shifting packing loading container vehicle transportation"),
        )

    def test_ac_jet_pump_query_ranks_ac_package_top(self):
        """'What is included in AC jet pump cleaning?' retrieves the AC package, not bathroom tile fixing."""
        results = KnowledgeRetriever.retrieve("What is included in AC jet pump cleaning?", top_k=2)
        self.assertTrue(len(results) > 0)
        top = results[0]
        self.assertIn("AC Service", top["title"])
        self.assertEqual(top["source_id"], "package:foam-power-jet-split")

    def test_ac_foam_wash_query_retrieves_semantically_related_ac_package(self):
        """'What happens during an AC foam wash?' retrieves the AC foam jet package."""
        results = KnowledgeRetriever.retrieve("What happens during an AC foam wash?", top_k=2)
        self.assertTrue(len(results) > 0)
        top = results[0]
        self.assertIn("AC Service", top["title"])

    def test_cancellation_query_retrieves_cancellation_policy(self):
        """'Can I cancel my booking?' retrieves the cancellation policy."""
        results = KnowledgeRetriever.retrieve("Can I cancel my booking?", top_k=2)
        self.assertTrue(len(results) > 0)
        self.assertIn("Cancellation", results[0]["title"])

    def test_gst_query_retrieves_pricing_and_gst_policy(self):
        """'How much GST do I pay?' retrieves the pricing and GST policy."""
        results = KnowledgeRetriever.retrieve("How much GST do I pay?", top_k=2)
        self.assertTrue(len(results) > 0)
        self.assertIn("GST", results[0]["title"])

    def test_house_shifting_query_retrieves_shifting_package(self):
        """'How does house shifting work?' retrieves the household shifting package."""
        results = KnowledgeRetriever.retrieve("How does house shifting work?", top_k=2)
        self.assertTrue(len(results) > 0)
        self.assertIn("Shifting", results[0]["title"])

    def test_unrelated_query_returns_empty(self):
        """'Can you recommend a good movie?' should return no confident chunks."""
        results = KnowledgeRetriever.retrieve("Can you recommend a good movie?", top_k=2)
        self.assertEqual(len(results), 0)

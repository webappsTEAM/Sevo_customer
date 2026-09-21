from django.core.management.base import BaseCommand
from ai_assistant.models import KnowledgeChunk, KnowledgeCategory
from ai_assistant.rag.allowlist import KnowledgeAllowlist, DisallowedKnowledgeSourceError
from ai_assistant.rag.embedder import Embedder
from service_requests.models import Package, PackageStatus


class Command(BaseCommand):
    help = "Ingests approved knowledge documents and active package FAQs into KnowledgeChunk table with semantic embeddings."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting knowledge ingestion with semantic embeddings (gemini-embedding-001)..."))

        items_to_ingest = []

        # 1. Collect Canonical Legal & Platform Policies
        policies = KnowledgeAllowlist.get_canonical_policies()
        for p in policies:
            KnowledgeAllowlist.validate_file_path(p["source_id"])
            items_to_ingest.append({
                "source_id": p["source_id"],
                "source_category": p.get("source_category", KnowledgeCategory.POLICY),
                "title": p["title"],
                "content": p["content"],
                "metadata": p.get("metadata", {}),
                "embed_text": f"{p['title']} {p['content']}",
                "display_name": f"Policy: {p['title']}",
            })

        # 2. Collect Active Catalog Package FAQs and Inclusions
        packages = Package.objects.select_related("service", "service__category").exclude(
            status__in=[PackageStatus.INACTIVE, PackageStatus.ARCHIVED]
        )

        for pkg in packages:
            pkg_source_id = f"package:{pkg.slug or pkg.id}"
            KnowledgeAllowlist.validate_file_path(pkg_source_id)

            def _format_list(val):
                if not isinstance(val, list) or not val:
                    return ""
                formatted = []
                for item in val:
                    if isinstance(item, str):
                        formatted.append(item)
                    elif isinstance(item, dict):
                        text_val = item.get("title") or item.get("text") or item.get("name") or str(item)
                        formatted.append(text_val)
                    else:
                        formatted.append(str(item))
                return ", ".join(formatted)

            includes_str = _format_list(pkg.includes) or "Standard service"
            excludes_str = _format_list(pkg.excludes) or "None specified"
            tools_str = _format_list(pkg.tools) or "Standard tools"
            ready_str = _format_list(pkg.ready) or "Clear access to work area"

            pkg_text = (
                f"Package: {pkg.name}\n"
                f"Service Category: {pkg.service.category.name if pkg.service and pkg.service.category else ''}\n"
                f"Description: {pkg.description}\n"
                f"Inclusions: {includes_str}\n"
                f"Exclusions: {excludes_str}\n"
                f"Tools Used: {tools_str}\n"
                f"Preparation Needed: {ready_str}\n"
                f"Estimated Duration: {pkg.duration or 'As per scope'}"
            )

            items_to_ingest.append({
                "source_id": pkg_source_id,
                "source_category": KnowledgeCategory.PACKAGE,
                "title": f"Package Scope: {pkg.name}",
                "content": pkg_text,
                "metadata": {
                    "package_id": pkg.id,
                    "slug": pkg.slug,
                    "category_slug": pkg.service.category.slug if pkg.service and pkg.service.category else "",
                },
                "embed_text": f"{pkg.name} {pkg_text}",
                "display_name": f"Package: {pkg.name}",
            })

            # Ingest individual package FAQs if present
            if isinstance(pkg.faqs, list) and pkg.faqs:
                for idx, faq_item in enumerate(pkg.faqs, 1):
                    q = faq_item.get("q") or faq_item.get("question") or ""
                    a = faq_item.get("a") or faq_item.get("answer") or ""
                    if q and a:
                        faq_source = f"package_faq:{pkg.slug}:{idx}"
                        faq_content = f"Question: {q}\nAnswer: {a}\nApplicable Package: {pkg.name}"
                        items_to_ingest.append({
                            "source_id": faq_source,
                            "source_category": KnowledgeCategory.FAQ,
                            "title": f"FAQ: {q[:60]} ({pkg.name})",
                            "content": faq_content,
                            "metadata": {"package_slug": pkg.slug, "question": q},
                            "embed_text": f"{q} {a} {pkg.name}",
                            "display_name": f"FAQ: {q[:40]} ({pkg.name})",
                        })

        self.stdout.write(f"Collected {len(items_to_ingest)} knowledge items to embed.")
        self.stdout.write("Generating semantic embeddings in batches...")

        # 3. Batch generate semantic embeddings and save incrementally
        batch_size = 20
        total_items = len(items_to_ingest)
        saved_count = 0

        for idx in range(0, total_items, batch_size):
            batch_slice = items_to_ingest[idx:idx + batch_size]
            batch_texts = [item["embed_text"] for item in batch_slice]
            batch_embs = Embedder.get_embeddings_batch(batch_texts, batch_size=batch_size)

            for item, emb in zip(batch_slice, batch_embs):
                KnowledgeChunk.objects.update_or_create(
                    source_id=item["source_id"],
                    defaults={
                        "source_category": item["source_category"],
                        "title": item["title"],
                        "content": item["content"],
                        "metadata": item["metadata"],
                        "embedding": emb,
                    },
                )
                saved_count += 1

            self.stdout.write(f"  Processed {saved_count}/{total_items} chunks...")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully ingested {saved_count} chunks with {Embedder.VECTOR_DIM}-dim semantic embeddings ({Embedder.MODEL_NAME})."
            )
        )


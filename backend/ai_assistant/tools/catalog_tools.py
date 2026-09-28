from typing import Dict, Any, Optional, List
from django.db.models import Q
from ai_assistant.tools.base import BaseTool
from service_requests.models import Package, CatalogCategory, ServiceFeedback, PackageStatus


class SearchProductsTool(BaseTool):
    name = "search_products"
    description = "Searches available service packages and categories in the CalServices marketplace catalog."
    parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Keywords describing the needed service or product (e.g. 'plumbing', 'AC cleaning', 'painting', 'vegetables').",
            },
            "category_slug": {
                "type": "string",
                "description": "Optional category filter (e.g. 'electrical', 'hvac', 'cleaning', 'painting').",
            },
        },
        "required": ["query"],
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], query: str, category_slug: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        q_clean = (query or "").strip()
        if not q_clean:
            return {"results": [], "count": 0}

        # Query packages that are active / published
        packages_qs = Package.objects.select_related("service", "service__category").exclude(
            status__in=[PackageStatus.INACTIVE, PackageStatus.ARCHIVED]
        )

        if category_slug:
            packages_qs = packages_qs.filter(service__category__slug=category_slug)

        import re
        q_lower = q_clean.lower()

        # Handle specific search for AC / HVAC services
        if q_lower in {"ac", "hvac", "air conditioner", "ac service", "ac repair"} or re.search(r"\bac\b", q_lower):
            search_q = (
                Q(name__iregex=r"\bac\b")
                | Q(service__category__slug__in=["ac_appliance", "hvac"])
                | Q(service__slug__icontains="ac")
                | Q(description__iregex=r"\bac\b")
            )
        elif len(q_clean) <= 3:
            esc = re.escape(q_clean)
            search_q = (
                Q(name__iregex=r"\b" + esc + r"\b")
                | Q(service__name__iregex=r"\b" + esc + r"\b")
            )
        else:
            search_q = (
                Q(name__icontains=q_clean)
                | Q(description__icontains=q_clean)
                | Q(tag__icontains=q_clean)
                | Q(service__name__icontains=q_clean)
            )

        packages = packages_qs.filter(search_q)[:25]

        results = []
        for p in packages:
            price_val = str(p.offer_price if p.offer_price is not None else p.base_price)
            results.append({
                "id": p.id,
                "name": p.name,
                "slug": p.slug,
                "service": p.service.name if p.service else "",
                "category": p.service.category.name if p.service and p.service.category else "",
                "price": price_val,
                "currency": "INR",
                "duration": p.duration or "As per scope",
                "popular": p.popular,
                "description": p.description[:180] if p.description else "",
            })

        # Also search top-level categories if query matches
        cats = CatalogCategory.objects.filter(is_active=True).filter(
            Q(name__icontains=q_clean) | Q(description__icontains=q_clean)
        )[:3]
        matched_categories = [
            {"id": c.id, "name": c.name, "slug": c.slug, "description": c.description}
            for c in cats
        ]

        return {
            "query": q_clean,
            "count": len(results),
            "packages": results,
            "categories": matched_categories,
        }


class GetProductDetailsTool(BaseTool):
    name = "get_product_details"
    description = "Retrieves comprehensive information for a specific catalog package, including inclusions, exclusions, preparation steps, tools used, and FAQs."
    parameters = {
        "type": "object",
        "properties": {
            "product_id": {
                "type": "string",
                "description": "The package numeric ID or slug (e.g. '12' or 'ac-regular-service').",
            },
        },
        "required": ["product_id"],
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], product_id: str, **kwargs) -> Dict[str, Any]:
        p_str = str(product_id).strip()
        try:
            if p_str.isdigit():
                pkg = Package.objects.select_related("service", "service__category").get(pk=int(p_str))
            else:
                pkg = Package.objects.select_related("service", "service__category").get(slug=p_str)
        except Package.DoesNotExist:
            return {"error": f"Package '{product_id}' not found in catalog."}

        price_val = str(pkg.offer_price if pkg.offer_price is not None else pkg.base_price)
        regular_price = str(pkg.base_price) if pkg.offer_price else None

        return {
            "package": {
                "id": pkg.id,
                "name": pkg.name,
                "slug": pkg.slug,
                "service": pkg.service.name if pkg.service else "",
                "category": pkg.service.category.name if pkg.service and pkg.service.category else "",
                "price": price_val,
                "original_price": regular_price,
                "currency": "INR",
                "duration": pkg.duration or "As per scope",
                "popular": pkg.popular,
                "description": pkg.description,
                "includes": pkg.includes if isinstance(pkg.includes, list) else [],
                "excludes": pkg.excludes if isinstance(pkg.excludes, list) else [],
                "tools_used": pkg.tools if isinstance(pkg.tools, list) else [],
                "keep_ready": pkg.ready if isinstance(pkg.ready, list) else [],
                "faqs": pkg.faqs if isinstance(pkg.faqs, list) else [],
                "rating_summary": f"{pkg.tag}" if pkg.tag else "Top Rated",
            }
        }


class GetProductReviewsTool(BaseTool):
    name = "get_product_reviews"
    description = "Retrieves verified customer reviews and ratings for a package or service category."
    parameters = {
        "type": "object",
        "properties": {
            "product_id": {
                "type": "string",
                "description": "The package ID or slug to fetch reviews for.",
            },
            "category": {
                "type": "string",
                "description": "Optional category name to retrieve category-level customer feedback.",
            },
        },
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], product_id: Optional[str] = None, category: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        reviews_list: List[Dict[str, Any]] = []

        # 1. If product_id given, check Package.reviews JSON field
        if product_id:
            p_str = str(product_id).strip()
            try:
                if p_str.isdigit():
                    pkg = Package.objects.get(pk=int(p_str))
                else:
                    pkg = Package.objects.get(slug=p_str)

                if isinstance(pkg.reviews, list):
                    for r in pkg.reviews:
                        reviews_list.append({
                            "source": "verified_package_review",
                            "reviewer": r.get("name", "Verified Customer"),
                            "rating": r.get("rating", 5),
                            "comment": r.get("text") or r.get("comment", ""),
                        })
            except Package.DoesNotExist:
                pass

        # 2. Fetch public feedback from ServiceFeedback table
        fb_qs = ServiceFeedback.objects.filter(is_submitted=True).select_related("service_request")
        if category:
            fb_qs = fb_qs.filter(
                Q(service_request__service_category__iexact=category)
                | Q(service_request__service_category__icontains=category)
            )

        fb_items = fb_qs.order_by("-submitted_at")[:5]
        for f in fb_items:
            reviews_list.append({
                "source": "customer_feedback",
                "reviewer": "Verified Customer",
                "category": f.service_request.service_category if f.service_request else "",
                "rating": f.rating or 5,
                "comment": f.comment or "Great service!",
            })

        return {
            "count": len(reviews_list),
            "reviews": reviews_list[:6],
        }

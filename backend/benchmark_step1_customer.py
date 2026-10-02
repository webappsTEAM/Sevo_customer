import os
import sys
import time
import django

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from django.db import connection, reset_queries
from django.test.utils import CaptureQueriesContext
from django.contrib.auth import get_user_model

from accounts.models import User
from orders.models import MarketplaceOrder, MarketplaceOrderItem, GroceryOrder, Order
from carts.models import Cart, CartItem, CartType, CartStatus
from service_requests.models import CatalogCategory, Package

from workforce_integration.marketplace_views import (
    MarketplaceProductListView,
    MarketplaceCategoryListView,
    CustomerMarketplaceBasketListView,
    CustomerMarketplaceBasketDetailView,
)
from carts.views import (
    CartDetailView,
    CartItemListView,
)
from orders.views import (
    MyOrdersView,
)
from orders.marketplace_views import (
    MarketplaceOrderDetailView,
)

User = get_user_model()
customer_user = User.objects.filter(role="customer").first()
if not customer_user:
    customer_user = User.objects.first()

sample_mkt_order = MarketplaceOrder.objects.first()
sample_order_num = sample_mkt_order.order_number if sample_mkt_order else "ORD-TEST-001"

factory = APIRequestFactory()

def profile_view(name, view_func, path, method="GET", user=None, data=None, query_params=None, headers=None, iterations=2):
    durations = []
    query_counts = []
    last_queries = []
    
    full_path = path
    if query_params:
        from urllib.parse import urlencode
        full_path = f"{path}?{urlencode(query_params)}"

    req_headers = {}
    if headers:
        req_headers.update(headers)

    response = None
    for i in range(iterations):
        reset_queries()
        if method == "GET":
            req = factory.get(full_path, **req_headers)
        else:
            req = factory.post(full_path, data=data or {}, format="json", **req_headers)
        
        if user:
            force_authenticate(req, user=user)
        
        with CaptureQueriesContext(connection) as ctx:
            start = time.perf_counter()
            response = view_func(req)
            elapsed = (time.perf_counter() - start) * 1000.0  # ms
            
        durations.append(elapsed)
        query_counts.append(len(ctx.captured_queries))
        if i == iterations - 1:
            last_queries = ctx.captured_queries

    avg_ms = sum(durations) / len(durations)
    q_count = query_counts[-1]
    
    status_code = getattr(response, "status_code", 200)
    data_len = 0
    if hasattr(response, "data"):
        data = response.data
        if isinstance(data, dict):
            inner_data = data.get("data", data)
            if isinstance(inner_data, dict):
                data_len = inner_data.get("count", len(inner_data.get("results", inner_data.get("items", inner_data))))
            elif isinstance(inner_data, list):
                data_len = len(inner_data)
        elif isinstance(data, list):
            data_len = len(data)

    print(f"[{name}] -> Status: {status_code} | Returned items: {data_len} | Avg Time: {avg_ms:.2f} ms | SQL Queries: {q_count}", flush=True)
    return {
        "name": name,
        "status_code": status_code,
        "items": data_len,
        "avg_ms": avg_ms,
        "query_count": q_count,
        "queries": last_queries,
    }

def run_benchmarks():
    print("=" * 80, flush=True)
    print("RUNNING STEP 1 BENCHMARKS: SEVO-CUSTOMER BACKEND", flush=True)
    print("=" * 80, flush=True)
    
    results = []

    # 7. Marketplace product feed (proxy to vendor)
    prod_view = MarketplaceProductListView.as_view()
    results.append(profile_view("7a. Marketplace Product Feed (size=20)", prod_view, "/api/marketplace/products/", query_params={"page_size": 20}))
    results.append(profile_view("7b. Marketplace Product Feed (size=50)", prod_view, "/api/marketplace/products/", query_params={"page_size": 50}))

    # 8. Marketplace category tree (proxy to vendor)
    cat_view = MarketplaceCategoryListView.as_view()
    results.append(profile_view("8. Marketplace Category Tree", cat_view, "/api/marketplace/categories/"))

    # 9. Cart fetch & item add
    cart_detail_view = lambda req: CartDetailView.as_view()(req, cart_type="marketplace")
    results.append(profile_view("9a. Marketplace Cart Fetch", cart_detail_view, "/api/carts/marketplace/", user=customer_user))
    
    # 10. Order history & Order detail
    my_orders_view = MyOrdersView.as_view()
    results.append(profile_view("10a. My Orders List (unified)", my_orders_view, "/api/orders/my/", user=customer_user))
    
    if sample_mkt_order:
        mkt_detail_view = lambda req: MarketplaceOrderDetailView.as_view()(req, order_number=sample_order_num)
        results.append(profile_view("10b. Marketplace Order Detail", mkt_detail_view, f"/api/orders/marketplace/{sample_order_num}/", user=customer_user))

    # 11. Basket listing & detail
    basket_list_view = CustomerMarketplaceBasketListView.as_view()
    results.append(profile_view("11a. Customer Basket List", basket_list_view, "/api/marketplace/baskets/", user=customer_user))

    print("\n" + "=" * 95, flush=True)
    print("STEP 1 CUSTOMER BENCHMARK SUMMARY TABLE", flush=True)
    print("=" * 95, flush=True)
    print(f"{'Endpoint':<42} | {'Items':<6} | {'Avg Time':<12} | {'Queries':<9} | {'Notes'}", flush=True)
    print("-" * 95, flush=True)
    for r in results:
        print(f"{r['name']:<42} | {r['items']:<6} | {r['avg_ms']:>8.2f} ms | {r['query_count']:>9} | status={r['status_code']}", flush=True)

if __name__ == "__main__":
    run_benchmarks()

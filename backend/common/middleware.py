import logging
import time
from django.db import connection

logger = logging.getLogger("performance")


class RequestLatencyLoggingMiddleware:
    """
    Middleware to log performance metrics for HTTP requests:
    - Method & Path
    - Response Status Code
    - Request Duration (ms)
    - Total SQL Queries executed during request
    Logs a warning if duration exceeds 200ms threshold.
    Strictly avoids logging authorization tokens, cookies, passwords, or sensitive payloads.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_queries = len(connection.queries)
        start_time = time.perf_counter()

        response = self.get_response(request)

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        num_queries = len(connection.queries) - start_queries

        method = request.method
        path = request.path
        status_code = response.status_code

        log_msg = (
            f"[PERF] {method} {path} - Status: {status_code} - "
            f"Duration: {duration_ms:.2f}ms - SQL Queries: {num_queries}"
        )

        if duration_ms > 200:
            logger.warning(f"[SLOW REQUEST] {log_msg}")
        else:
            logger.info(log_msg)

        return response

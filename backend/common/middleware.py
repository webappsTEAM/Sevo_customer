import asyncio
import logging
import time
from asgiref.sync import iscoroutinefunction, markcoroutinefunction
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
    Supports both synchronous and asynchronous (ASGI/Daphne) request processing.
    """

    sync_capable = True
    async_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        self.async_mode = iscoroutinefunction(self.get_response)
        if self.async_mode:
            markcoroutinefunction(self)

    def __call__(self, request):
        if self.async_mode:
            return self.__acall__(request)

        start_queries = self._get_query_count()
        start_time = time.perf_counter()

        response = self.get_response(request)

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        num_queries = self._get_query_count() - start_queries

        self._log_perf(request, response, duration_ms, num_queries)
        return response

    async def __acall__(self, request):
        start_queries = self._get_query_count()
        start_time = time.perf_counter()

        try:
            response = await self.get_response(request)
        except asyncio.CancelledError:
            # Client disconnected or cancelled the request before response completed.
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            logger.debug(
                f"[PERF] {getattr(request, 'method', 'UNKNOWN')} {getattr(request, 'path', '')} - "
                f"Client Disconnected / Request Cancelled ({duration_ms:.2f}ms)"
            )
            raise

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        num_queries = self._get_query_count() - start_queries

        self._log_perf(request, response, duration_ms, num_queries)
        return response

    def _get_query_count(self):
        try:
            return len(connection.queries)
        except Exception:
            return 0

    def _log_perf(self, request, response, duration_ms, num_queries):
        try:
            method = getattr(request, "method", "UNKNOWN")
            path = getattr(request, "path", "")
            status_code = getattr(response, "status_code", "UNKNOWN")

            log_msg = (
                f"[PERF] {method} {path} - Status: {status_code} - "
                f"Duration: {duration_ms:.2f}ms - SQL Queries: {num_queries}"
            )

            if duration_ms > 200:
                logger.warning(f"[SLOW REQUEST] {log_msg}")
            else:
                logger.info(log_msg)
        except Exception:
            pass


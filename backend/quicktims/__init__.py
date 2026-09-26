
# Make Celery app available at module level so Django's auto-reload
# and management commands pick it up correctly.
from .celery import app as celery_app  # noqa: F401

__all__ = ["celery_app"]

# Python 3.14 compatibility patch for Django BaseContext.__copy__
try:
    from django.template.context import BaseContext
    def _py314_basecontext_copy(self):
        dup = self.__class__.__new__(self.__class__)
        dup.dicts = self.dicts[:]
        return dup
    BaseContext.__copy__ = _py314_basecontext_copy
except Exception:
    pass

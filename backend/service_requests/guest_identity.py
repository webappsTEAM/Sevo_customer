"""GT_GUEST_NO_ATTACH: a phone/email match is not proof the anonymous requester controls that account."""
import contextvars

_no_autolink = contextvars.ContextVar("sevo_guest_no_autolink", default=False)


def autolink_suppressed():
    return _no_autolink.get()


class suppress_identity_autolink:
    def __enter__(self):
        self._t = _no_autolink.set(True)

    def __exit__(self, *a):
        _no_autolink.reset(self._t)
        return False

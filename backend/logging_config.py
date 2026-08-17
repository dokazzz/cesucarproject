"""
Application logging.

Two formats, one switch. Locally, plain lines are readable in a terminal.
In production LOG_JSON=true emits one JSON object per line, which is what
Promtail ships to Loki and what makes fields queryable instead of grepped.

Nothing here writes to a file: the process logs to stdout, and whatever
supervises it (systemd, a container runtime) owns collection and rotation.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime

from config import config

# Attributes present on every LogRecord. Anything else was attached by the
# caller via `extra=` and belongs in the structured output.
_STANDARD_FIELDS = {
    "args", "asctime", "created", "exc_info", "exc_text", "filename",
    "funcName", "levelname", "levelno", "lineno", "module", "msecs",
    "message", "msg", "name", "pathname", "process", "processName",
    "relativeCreated", "stack_info", "taskName", "thread", "threadName",
}


class JsonFormatter(logging.Formatter):
    """One JSON object per line, with any `extra=` fields merged in."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level":     record.levelname,
            "logger":    record.name,
            "message":   record.getMessage(),
        }

        for key, value in record.__dict__.items():
            if key not in _STANDARD_FIELDS and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


class TextFormatter(logging.Formatter):
    """Readable single line, with the interesting context appended."""

    _CONTEXT = ("request_id", "method", "path", "user_id", "user_rgm", "client_ip", "status")

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        bits = [
            f"{key}={record.__dict__[key]}"
            for key in self._CONTEXT
            if record.__dict__.get(key) is not None
        ]
        return f"{base}  [{' '.join(bits)}]" if bits else base


def setup_logging() -> logging.Logger:
    """Configure the root logger. Safe to call more than once."""
    root = logging.getLogger()
    root.setLevel(config.LOG_LEVEL)

    for existing in list(root.handlers):
        root.removeHandler(existing)

    handler = logging.StreamHandler(sys.stdout)
    if config.LOG_JSON:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            TextFormatter("%(asctime)s %(levelname)-8s %(name)s: %(message)s", "%H:%M:%S")
        )
    root.addHandler(handler)

    # Uvicorn installs its own handlers; let them bubble up to ours instead so
    # every line in production has the same shape.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True

    return logging.getLogger("cesucar")

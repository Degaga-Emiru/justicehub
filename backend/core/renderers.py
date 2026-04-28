"""
Custom DRF renderer that outputs native Unicode characters (e.g., Amharic ፊደል)
instead of escaping them as \\uXXXX sequences.

DRF's default JSONRenderer uses json.dumps(ensure_ascii=True), which converts
all non-ASCII characters to escape sequences like \\u134D\\u1275\\u1205.
While technically valid JSON, this causes issues with:
  - Debugging and log readability
  - Some frontend rendering paths
  - Copy-paste workflows
  - Human inspection of API responses

This renderer sets ensure_ascii=False so that Amharic, Arabic, Chinese,
and all other Unicode text is transmitted as native UTF-8 characters.
"""
import json

from rest_framework.renderers import JSONRenderer


class UTF8JSONRenderer(JSONRenderer):
    """
    A JSONRenderer subclass that preserves native Unicode characters
    in API responses instead of ASCII-escaping them.

    Usage in settings.py:
        REST_FRAMEWORK = {
            'DEFAULT_RENDERER_CLASSES': (
                'core.renderers.UTF8JSONRenderer',
            ),
            ...
        }
    """
    charset = 'utf-8'
    ensure_ascii = False

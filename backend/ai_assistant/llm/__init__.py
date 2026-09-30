import os
from ai_assistant.llm.base import BaseLLMProvider, LLMResponse
from ai_assistant.llm.mock_provider import MockDeterministicProvider
from ai_assistant.llm.openai_provider import OpenAIProvider
from ai_assistant.llm.gemini_provider import GeminiProvider


def get_llm_provider() -> BaseLLMProvider:
    """
    Returns configured LLM provider based on environment variables.
    Supports single or multiple Gemini API keys for automatic fallback:
    1. GEMINI_API_KEY / GEMINI_API_KEYS (supports comma/semicolon/newline separated list)
    2. GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... GEMINI_API_KEY_9
    3. OPENAI_API_KEY -> OpenAIProvider (gpt-4o-mini)
    4. MockDeterministicProvider (offline fallback)
    """
    # Ensure freshly edited .env keys are loaded into environment if not already present
    if "GEMINI_API_KEY" not in os.environ and "GEMINI_API_KEYS" not in os.environ:
        try:
            from dotenv import load_dotenv
            from django.conf import settings
            env_file = getattr(settings, "BASE_DIR", None)
            if env_file:
                load_dotenv(env_file / ".env", override=False)
        except Exception:
            pass

    gemini_keys = []

    # Check GEMINI_API_KEYS or GEMINI_API_KEY
    raw_keys = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY") or ""
    for k in raw_keys.replace(";", ",").replace("\n", ",").split(","):
        k = k.strip()
        if k and len(k) > 10 and not k.startswith("<") and k not in gemini_keys:
            gemini_keys.append(k)

    # Check numbered keys GEMINI_API_KEY_1 .. GEMINI_API_KEY_9
    for i in range(1, 10):
        k = os.getenv(f"GEMINI_API_KEY_{i}", "").strip()
        if k and len(k) > 10 and not k.startswith("<") and k not in gemini_keys:
            gemini_keys.append(k)

    if gemini_keys:
        return GeminiProvider(api_key=gemini_keys)

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and len(openai_key.strip()) > 10 and not openai_key.startswith("<"):
        return OpenAIProvider(api_key=openai_key.strip())

    return MockDeterministicProvider()


__all__ = [
    "BaseLLMProvider",
    "LLMResponse",
    "MockDeterministicProvider",
    "OpenAIProvider",
    "GeminiProvider",
    "get_llm_provider",
]

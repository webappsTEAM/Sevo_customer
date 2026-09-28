import os
from ai_assistant.llm.base import BaseLLMProvider, LLMResponse
from ai_assistant.llm.mock_provider import MockDeterministicProvider
from ai_assistant.llm.openai_provider import OpenAIProvider
from ai_assistant.llm.gemini_provider import GeminiProvider


def get_llm_provider() -> BaseLLMProvider:
    """
    Returns configured LLM provider based on environment variables.
    Priority:
    1. GEMINI_API_KEY -> GeminiProvider (gemini-3.6-flash / gemini-flash-latest)
    2. OPENAI_API_KEY -> OpenAIProvider (gpt-4o-mini)
    3. MockDeterministicProvider (offline fallback)
    """
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and len(gemini_key.strip()) > 10 and not gemini_key.startswith("<"):
        return GeminiProvider(api_key=gemini_key.strip())

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

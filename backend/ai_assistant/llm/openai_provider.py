import os
import json
from typing import List, Dict, Any
from ai_assistant.llm.base import BaseLLMProvider, LLMResponse


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI / OpenAI-compatible provider with native tool calling support.
    Active when OPENAI_API_KEY is configured in environment.
    """

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    def generate(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: str,
        context: Dict[str, Any],
    ) -> LLMResponse:
        import requests

        full_messages = [{"role": "system", "content": system_prompt}]
        full_messages.extend(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": full_messages,
            "temperature": 0.2,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")
        resp = requests.post(base_url, headers=headers, json=payload, timeout=25)
        resp.raise_for_status()
        data = resp.json()

        choice = data["choices"][0]["message"]
        content = choice.get("content") or ""
        tool_calls_raw = choice.get("tool_calls") or []

        parsed_tool_calls = []
        for tc in tool_calls_raw:
            func = tc.get("function", {})
            try:
                args = json.loads(func.get("arguments", "{}"))
            except Exception:
                args = {}
            parsed_tool_calls.append({
                "id": tc.get("id"),
                "function": {
                    "name": func.get("name"),
                    "arguments": args,
                },
            })

        return LLMResponse(content=content, tool_calls=parsed_tool_calls, raw=data)

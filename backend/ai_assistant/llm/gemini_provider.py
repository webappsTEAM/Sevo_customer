import os
import json
import logging
import requests
from typing import List, Dict, Any
from ai_assistant.llm.base import BaseLLMProvider, LLMResponse

logger = logging.getLogger(__name__)


def _clean_schema(schema: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively removes additionalProperties and cleans properties for Gemini schema."""
    if not isinstance(schema, dict):
        return schema
    cleaned = {}
    for k, v in schema.items():
        if k == "additionalProperties":
            continue
        if isinstance(v, dict):
            cleaned[k] = _clean_schema(v)
        elif isinstance(v, list):
            cleaned[k] = [_clean_schema(item) if isinstance(item, dict) else item for item in v]
        else:
            cleaned[k] = v
    return cleaned


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini provider using the official Google AI Studio native generateContent REST endpoint.
    Supports native tool / function calling, RAG synthesis, and automatic model fallback.
    """

    CANDIDATE_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"]

    def __init__(self, api_key: str, model: str = "gemini-3.5-flash"):
        self.api_key = api_key
        self.model = model

    def generate(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: str,
        context: Dict[str, Any],
    ) -> LLMResponse:
        # Build contents from messages
        contents: List[Dict[str, Any]] = []
        for m in messages:
            raw_role = m.get("role", "user")
            content_str = str(m.get("content") or "").strip()
            if not content_str:
                continue

            if raw_role in ("assistant", "model"):
                role = "model"
            elif raw_role == "tool":
                role = "user"
                content_str = f"[Tool Execution Result]:\n{content_str}"
            else:
                role = "user"

            if contents and contents[-1]["role"] == role:
                contents[-1]["parts"].append({"text": content_str})
            else:
                contents.append({
                    "role": role,
                    "parts": [{"text": content_str}],
                })

        if not contents:
            contents = [{"role": "user", "parts": [{"text": "Hello"}]}]

        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
            },
        }

        if system_prompt:
            payload["system_instruction"] = {
                "parts": [{"text": system_prompt}]
            }

        # Convert tools to Gemini function_declarations format
        if tools:
            func_decls = []
            for t in tools:
                fn = t.get("function", t)
                name = fn.get("name")
                if not name:
                    continue
                decl = {
                    "name": name,
                    "description": fn.get("description", ""),
                }
                params = fn.get("parameters")
                if params and isinstance(params, dict):
                    decl["parameters"] = _clean_schema(params)
                func_decls.append(decl)

            if func_decls:
                payload["tools"] = [{"function_declarations": func_decls}]

        # Try primary model first, fallback to alternatives on 503/429
        models_to_try = [self.model] + [m for m in self.CANDIDATE_MODELS if m != self.model]
        last_error = None
        data = None

        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
            try:
                resp = requests.post(url, json=payload, timeout=12)
                if resp.status_code == 200:
                    data = resp.json()
                    break
                elif resp.status_code in (429, 503):
                    logger.warning(
                        "Gemini model %s returned status %d. Falling back...",
                        model_name,
                        resp.status_code,
                    )
                    last_error = resp.text
                    continue
                else:
                    logger.error("Gemini API error %d: %s", resp.status_code, resp.text)
                    resp.raise_for_status()
            except requests.RequestException as exc:
                logger.warning("Network error calling Gemini model %s: %s", model_name, exc)
                last_error = str(exc)
                continue

        if data is None:
            logger.error("All Gemini candidate models failed: %s", last_error)
            return LLMResponse(
                content="I apologize, but I am currently experiencing temporary service limitations. Please try again shortly.",
                tool_calls=[],
                raw={"error": str(last_error)},
            )

        candidates = data.get("candidates", [])
        if not candidates:
            return LLMResponse(content="", tool_calls=[], raw=data)

        cand = candidates[0]
        parts = cand.get("content", {}).get("parts", [])
        text_parts = []
        parsed_tool_calls = []

        for p in parts:
            if "text" in p:
                text_parts.append(p["text"])
            if "functionCall" in p:
                fc = p["functionCall"]
                parsed_tool_calls.append({
                    "id": fc.get("id") or f"call_{fc.get('name')}",
                    "function": {
                        "name": fc.get("name"),
                        "arguments": fc.get("args") or {},
                    },
                })

        final_content = "\n".join(text_parts).strip()
        return LLMResponse(content=final_content, tool_calls=parsed_tool_calls, raw=data)


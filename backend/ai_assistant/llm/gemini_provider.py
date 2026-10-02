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
    Supports native tool / function calling, RAG synthesis, multiple API key rotation/fallback,
    and automatic model fallback.
    """

    CANDIDATE_MODELS = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
    ]

    _current_key_index: int = 0

    def __init__(self, api_key: Any, model: str = "gemini-3.6-flash"):
        self.api_keys: List[str] = []
        if isinstance(api_key, list):
            for k in api_key:
                if isinstance(k, str) and len(k.strip()) > 10:
                    self.api_keys.append(k.strip())
        elif isinstance(api_key, str):
            for k in api_key.replace(";", ",").replace("\n", ",").split(","):
                k = k.strip()
                if k and len(k) > 10 and not k.startswith("<"):
                    self.api_keys.append(k)

        self.api_key = self.api_keys[0] if self.api_keys else ""
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
            content_str = (m.get("content") or "").strip()
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

        num_keys = len(self.api_keys)
        if num_keys == 0:
            logger.warning("No valid Gemini API keys configured. Falling back to deterministic provider.")
            from ai_assistant.llm.mock_provider import MockDeterministicProvider
            mock_res = MockDeterministicProvider().generate(
                messages=messages,
                tools=tools,
                system_prompt=system_prompt,
                context=context,
            )
            mock_res.provider_name = "MockDeterministicProvider (No API Key)"
            return mock_res

        # Try API keys starting from the current working key index
        key_indices = [(GeminiProvider._current_key_index + i) % num_keys for i in range(num_keys)]
        models_to_try = [self.model] + [m for m in self.CANDIDATE_MODELS if m != self.model]

        data = None
        successful_model = None
        successful_key = None
        last_error = None

        for k_idx in key_indices:
            current_key = self.api_keys[k_idx]
            masked_key = f"...{current_key[-6:]}" if len(current_key) >= 6 else "***"

            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={current_key}"
                try:
                    resp = requests.post(url, json=payload, timeout=12)
                    if resp.status_code == 200:
                        data = resp.json()
                        successful_model = model_name
                        successful_key = current_key
                        GeminiProvider._current_key_index = k_idx
                        break
                    elif resp.status_code in (400, 401, 403):
                        logger.warning(
                            "Gemini API key %s returned status %d (invalid/expired). Falling back to next API key...",
                            masked_key,
                            resp.status_code,
                        )
                        last_error = f"Status {resp.status_code} for key {masked_key}"
                        # Skip remaining models for this expired/invalid key
                        break
                    elif resp.status_code == 429:
                        logger.warning(
                            "Gemini API key %s quota exhausted (429) on model %s. Falling back to next API key...",
                            masked_key,
                            model_name,
                        )
                        last_error = f"Quota exceeded (429) for key {masked_key}"
                        # Quota is per-key/project, skip to next key
                        break
                    elif resp.status_code == 503:
                        logger.warning(
                            "Gemini model %s returned status 503 (overloaded) on key %s. Trying next model...",
                            model_name,
                            masked_key,
                        )
                        last_error = f"Status 503 on model {model_name}"
                        continue
                    else:
                        logger.error("Gemini API error %d on key %s: %s", resp.status_code, masked_key, resp.text)
                        last_error = resp.text
                        continue
                except requests.RequestException as exc:
                    logger.warning("Network error calling Gemini model %s with key %s: %s", model_name, masked_key, exc)
                    last_error = str(exc)
                    continue

            if data is not None:
                break

        if data is None:
            logger.warning(
                "All %d Gemini API key(s) failed or exhausted (last error: %s). Falling back to deterministic provider.",
                num_keys,
                last_error,
            )
            from ai_assistant.llm.mock_provider import MockDeterministicProvider
            mock_res = MockDeterministicProvider().generate(
                messages=messages,
                tools=tools,
                system_prompt=system_prompt,
                context=context,
            )
            mock_res.provider_name = "MockDeterministicProvider (Fallback - All Keys Exhausted/Expired)"
            return mock_res

        candidates = data.get("candidates", [])
        masked = f"...{successful_key[-6:]}" if successful_key and len(successful_key) >= 6 else ""
        key_label = f", key: {masked}" if masked else ""
        provider_display = f"Google Gemini ({successful_model}{key_label})"

        if not candidates:
            return LLMResponse(content="", tool_calls=[], raw=data, provider_name=provider_display)

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
        return LLMResponse(content=final_content, tool_calls=parsed_tool_calls, raw=data, provider_name=provider_display)


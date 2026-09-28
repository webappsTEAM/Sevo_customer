from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class LLMResponse:
    content: str
    tool_calls: List[Dict[str, Any]]
    raw: Optional[Dict[str, Any]] = None


class BaseLLMProvider(ABC):
    """
    Abstract LLM provider interface for CalServices AI Assistant.
    """

    @abstractmethod
    def generate(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: str,
        context: Dict[str, Any],
    ) -> LLMResponse:
        pass

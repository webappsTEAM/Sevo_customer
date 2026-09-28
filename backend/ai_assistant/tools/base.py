from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseTool(ABC):
    """
    Abstract read-only tool for CalServices AI Assistant.
    """
    name: str = ""
    description: str = ""
    parameters: Dict[str, Any] = {}

    @abstractmethod
    def execute(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        """
        Executes the read-only query using authenticated context.
        """
        pass

    def to_schema(self) -> Dict[str, Any]:
        """
        Converts tool definition to standard OpenAI-compatible function schema.
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

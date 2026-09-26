from typing import Dict, Any, List, Optional
from ai_assistant.tools.base import BaseTool
from ai_assistant.guardrails.tool_guard import ToolGuard
from ai_assistant.models import AIAuditLog, AuthorizationResult, AuditStatus
from ai_assistant.tools.customer_tools import (
    GetCustomerProfileTool,
    GetCustomerOrdersTool,
    GetOrderDetailsTool,
    GetDeliveryStatusTool,
)
from ai_assistant.tools.catalog_tools import (
    SearchProductsTool,
    GetProductDetailsTool,
    GetProductReviewsTool,
)


class ToolRegistry:
    """
    Central registry for read-only tools.
    Every execution is strictly gated by ToolGuard and audited in AIAuditLog.
    """

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def _register_default_tools(self):
        self.register(GetCustomerProfileTool())
        self.register(GetCustomerOrdersTool())
        self.register(GetOrderDetailsTool())
        self.register(GetDeliveryStatusTool())
        self.register(SearchProductsTool())
        self.register(GetProductDetailsTool())
        self.register(GetProductReviewsTool())

    def get_schemas_for_context(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Returns only tools the current user/context is allowed to see.
        """
        user = context.get("user")
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))

        schemas = []
        for name, tool in self._tools.items():
            if name in ToolGuard.CUSTOMER_TOOLS and not is_authenticated:
                continue
            schemas.append(tool.to_schema())
        return schemas

    def execute(self, tool_name: str, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        tool = self.get(tool_name)
        user = context.get("user")
        user_id = str(user.id) if user and getattr(user, "is_authenticated", False) else None
        role = context.get("role", "customer")
        agent_type = context.get("agent_type", "customer")
        resource_id = str(params.get("order_id") or params.get("id") or params.get("product_id") or "")

        if not tool:
            AIAuditLog.objects.create(
                user_id=user_id,
                role=role,
                agent_type=agent_type,
                user_query=context.get("query", ""),
                tool_name=tool_name,
                resource_id=resource_id,
                authorization_result=AuthorizationResult.DENIED,
                status=AuditStatus.ERROR,
                details={"error": f"Tool '{tool_name}' not found"},
            )
            return {"error": f"Tool '{tool_name}' is not registered."}

        # 1. Server-side Gate via ToolGuard
        guard_res = ToolGuard.authorize(tool_name, context, params)
        if not guard_res.is_authorized:
            AIAuditLog.objects.create(
                user_id=user_id,
                role=role,
                agent_type=agent_type,
                user_query=context.get("query", ""),
                tool_name=tool_name,
                resource_id=resource_id,
                authorization_result=AuthorizationResult.DENIED,
                status=AuditStatus.BLOCKED_BY_GUARDRAIL,
                details={"reason": guard_res.reason},
            )
            return {"error": guard_res.error_message or "Unauthorized to execute this tool."}

        # 2. Execute read-only tool
        try:
            result = tool.execute(context, **params)
            AIAuditLog.objects.create(
                user_id=user_id,
                role=role,
                agent_type=agent_type,
                user_query=context.get("query", ""),
                tool_name=tool_name,
                resource_id=resource_id,
                authorization_result=AuthorizationResult.GRANTED,
                status=AuditStatus.SUCCESS,
                details={"params": params},
            )
            return result
        except Exception as e:
            AIAuditLog.objects.create(
                user_id=user_id,
                role=role,
                agent_type=agent_type,
                user_query=context.get("query", ""),
                tool_name=tool_name,
                resource_id=resource_id,
                authorization_result=AuthorizationResult.GRANTED,
                status=AuditStatus.ERROR,
                details={"exception": str(e)},
            )
            return {"error": f"Tool execution error: {str(e)}"}


# Global registry instance
default_tool_registry = ToolRegistry()

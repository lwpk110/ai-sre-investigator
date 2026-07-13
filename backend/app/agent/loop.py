"""Agent tool-calling 循环（ADR-001 原生 SDK，ADR-005 优雅失败）。

使用 openai SDK 原生 chat.completions.create + tools 参数，
不使用任何 agent 框架。循环持续到 LLM 返回 finish_reason="stop"
或预算耗尽（生成部分 RCA）。
"""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from openai import AsyncOpenAI

from app.agent.budget import BudgetExhausted, BudgetTracker
from app.agent.events import (
    SSEEvent,
    budget_update,
    error,
    rca_complete,
    rca_partial,
    thinking,
    tool_call,
    tool_result,
)
from app.agent.safe_executor import SafeToolExecutor
from app.config import settings
from app.tools.base import ToolSpec

logger = logging.getLogger(__name__)

# 系统提示词 — 告诉 Agent 它的职责和约束
SYSTEM_PROMPT = """你是一个 SRE 故障排查 Agent。用户用自然语言描述故障，
你需要：
1. 将问题拆解为指标查询（PromQL）、日志查询（LogQL）、链路查询（TraceQL）
2. 逐步调用工具收集证据
3. 基于证据生成结构化的根因分析报告（RCA）

规则：
- 每次只调用一个工具，等待结果后再决定下一步
- 如果查询失败，修正后重试
- 基于证据做结论，不要猜测
-- 最后输出一个 Markdown 格式的 RCA 报告

置信度标注（重要）：
- 高置信度：有明确的指标异常 + 日志证据 + 链路证据三方面佐证
- 中置信度：有两方面证据，但缺少一方面
- 低置信度：只有单一证据或证据不充分
- 在报告末尾用以下格式标注：**置信度: 高/中/低**
- 低置信度时，列出 2-3 条"建议进一步排查"的具体方向"""


class AgentLoop:
    """Agent tool-calling 循环，使用 openai SDK 原生接口。"""

    def __init__(
        self,
        tools: list[ToolSpec],
        executor: SafeToolExecutor,
        budget: BudgetTracker,
        client: AsyncOpenAI | None = None,
        model: str | None = None,
    ) -> None:
        self._tools = {t.name: t for t in tools}
        self._executor = executor
        self._budget = budget
        self._client = client
        self._model = model or settings.llm_model

        # 为 executor 注入 self-heal 回调（ADR-004 L4）
        self._executor._heal_callback = self._heal_callback

    def _heal_callback(
        self,
        tool_name: str,
        params: Any,
        error: str,
    ) -> Any:
        """同步包装，返回异步 heal 协程供 executor await。"""
        return self._async_heal(tool_name, params, error)

    async def _async_heal(
        self,
        tool_name: str,
        params: Any,
        error: str,
    ) -> Any:
        """向 LLM 请求修正失败的查询参数。

        将错误信息和原始参数发给 LLM，让其返回修正后的 JSON。
        无法修正时返回 None。
        """
        tool = self._tools.get(tool_name)
        if tool is None or self._client is None:
            return None

        try:
            heal_prompt = (
                f"工具 {tool_name} 执行失败，错误信息: {error}\n"
                f"原始参数: {params.model_dump_json()}\n"
                f"请修正参数并返回合法 JSON 对象。只返回 JSON，不要其他内容。"
            )
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是查询修正助手。修正失败的查询参数，返回合法 JSON。",
                    },
                    {"role": "user", "content": heal_prompt},
                ],
            )

            content = response.choices[0].message.content or ""
            content = content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

            healed_params = json.loads(content)
            return tool.parameters(**healed_params)

        except Exception as exc:
            logger.warning("self-heal 回调异常: %s", exc)
            return None

    async def run(
        self,
        user_message: str,
        prior_context: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[SSEEvent]:
        """运行 Agent 循环，yield SSE 事件。

        循环持续到：
        - LLM 返回 finish_reason="stop" → 发送 rca_complete
        - 预算耗尽 → 发送 rca_partial
        - 异常 → 发送 error

        Args:
            user_message: 当前用户的问题。
            prior_context: 对话式追问的历史上下文（可选）。
                格式: [{"role": "user"|"assistant", "content": "..."}]
                当追问时传入，让 LLM 理解之前的排查过程和结论。
        """
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        # 追问时携带历史上下文
        if prior_context:
            messages.extend(prior_context)

        messages.append({"role": "user", "content": user_message})

        tool_schemas = [t.to_openai_schema() for t in self._tools.values()]

        client = self._client or AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        )

        evidence: list[str] = []  # 收集的证据，用于部分 RCA
        step = 0

        try:
            while True:
                step += 1

                # 预算检查
                if self._budget.is_exhausted:
                    yield self._generate_partial_rca(messages, evidence, [])
                    return

                yield thinking(f"第 {step} 步推理中...")

                # 调用 LLM（原生 tool-calling，ADR-001）
                response = await client.chat.completions.create(
                    model=self._model,
                    messages=messages,  # type: ignore[arg-type]
                    tools=tool_schemas if tool_schemas else None,  # type: ignore[arg-type]
                )

                # 记录 token 消耗
                if response.usage:
                    self._budget.consume_tokens(
                        response.usage.total_tokens or 0
                    )
                yield budget_update(
                    self._budget.tokens_used,
                    self._budget.max_tokens,
                    self._budget.tool_calls,
                    self._budget.max_tool_calls,
                )

                choice = response.choices[0]
                assistant_msg = choice.message

                # 将 assistant 消息加入历史
                messages.append({
                    "role": "assistant",
                    "content": assistant_msg.content or "",
                    **(
                        {"tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                            for tc in (assistant_msg.tool_calls or [])
                            if hasattr(tc, "function")
                        ]}
                        if assistant_msg.tool_calls
                        else {}
                    ),
                })

                # 如果 LLM 不再调用工具 → RCA 完成
                if choice.finish_reason == "stop" or not assistant_msg.tool_calls:
                    yield rca_complete(
                        report=assistant_msg.content or "",
                        confidence="high" if len(evidence) >= 2 else "medium",
                    )
                    return

                # 执行每个工具调用（跳过非 function 类型的 tool_call）
                for tc in assistant_msg.tool_calls:
                    if not hasattr(tc, "function"):
                        continue
                    tool_name = tc.function.name
                    tool = self._tools.get(tool_name)

                    if tool is None:
                        # 未知工具，反馈给 LLM
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(
                                {"error": f"未知工具: {tool_name}"}
                            ),
                        })
                        continue

                    # 解析参数
                    try:
                        params_dict = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        params_dict = {
                            "query": tc.function.arguments
                        }

                    params = tool.parameters(**params_dict)

                    yield tool_call(tool_name, params_dict)

                    # 执行（经过 SafeToolExecutor 四层包装）
                    try:
                        result = await self._executor.call(tool, params)
                    except BudgetExhausted:
                        # 追踪因预算耗尽而未能执行的查询
                        pending = [f"{tool_name}: {params_dict.get('query', '')}"]
                        yield self._generate_partial_rca(
                            messages, evidence, pending
                        )
                        return

                    yield tool_result(
                        tool_name=tool_name,
                        success=result.success,
                        data=result.data,
                        error=result.error,
                        latency_ms=result.latency_ms,
                        cached=result.cached,
                    )

                    # 收集证据
                    if result.success and result.data:
                        evidence.append(
                            f"[{tool_name}] {json.dumps(result.data, ensure_ascii=False)[:200]}"
                        )

                    # 将结果反馈给 LLM（tool role message）
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(
                            {
                                "success": result.success,
                                "data": result.data,
                                "error": result.error,
                            },
                            ensure_ascii=False,
                        ),
                    })

        except Exception as exc:
            logger.exception("Agent 循环异常")
            yield error(f"Agent 循环异常: {exc!s}")

    def _generate_partial_rca(
        self,
        messages: list[dict[str, Any]],
        evidence: list[str],
        pending_queries: list[str],
    ) -> SSEEvent:
        """预算耗尽时，基于已收集的证据生成部分 RCA。"""
        if evidence:
            report = (
                "## 部分 RCA（预算耗尽）\n\n"
                "由于查询预算耗尽，未能完成全部排查。以下是基于已有证据的部分结论：\n\n"
                + "\n".join(f"- {e}" for e in evidence)
               + "\n\n**建议**：手动继续排查以下方面。"
            )
        else:
            report = "## 部分 RCA（预算耗尽）\n\n未能收集到任何证据，请重试。"

        # 缺失查询列表：预算耗尽导致未执行
        missing = pending_queries if pending_queries else ["预算耗尽，未完成排查"]

        # 基于已有证据和缺失项生成建议
        suggestions = self._generate_suggestions(evidence, pending_queries)

        return rca_partial(
            report=report,
            missing=missing,
            suggestions=suggestions,
        )

    def _generate_suggestions(
        self,
        evidence: list[str],
        pending_queries: list[str],
    ) -> list[str]:
        """基于已有证据和缺失查询生成排查建议。

        低置信度场景的典型建议方向：
        - 扩大时间窗口查看趋势
        - 查看相关日志确认异常
        - 追踪关键 TraceID 的下游调用
        """
        suggestions: list[str] = []

        # 如果有待执行的查询，直接作为建议
        for q in pending_queries:
            tool_name = q.split(":")[0] if ":" in q else ""
            if "mimir" in tool_name:
                suggestions.append("扩大指标查询时间窗口，确认趋势变化")
            elif "loki" in tool_name:
                suggestions.append("查看相关服务的错误日志")
            elif "tempo" in tool_name:
                suggestions.append("展开关键 TraceID 的下游调用链")
            else:
                suggestions.append(f"继续执行: {q}")

        # 补充通用建议（至少 2 条）
        if len(suggestions) < 2:
            if not any("时间窗口" in s for s in suggestions):
                suggestions.append("把 p99 延迟拉长 3 小时看趋势")
            if not any("日志" in s for s in suggestions):
                suggestions.append("查看相关服务的错误日志")

        return suggestions[:3]  # 最多 3 条建议

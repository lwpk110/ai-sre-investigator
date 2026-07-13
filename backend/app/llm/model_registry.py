"""多模型路由注册表（V3-F3）。

支持配置多个 LLM 后端（云端 / 本地），可按需切换当前使用的模型。
AgentLoop 使用 ModelRegistry 选定的模型。
"""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Any


@dataclass
class ModelConfig:
    """单个模型配置。"""

    id: str  # 唯一标识
    name: str  # 显示名称
    provider: str = "openai"  # openai / anthropic / custom
    model: str = ""  # 模型 ID（如 gpt-4o / MiniMax-M3）
    base_url: str = ""  # API 地址（空=默认）
    api_key_env: str = "OPENAI_API_KEY"  # 环境变量名
    cost_per_1k_tokens: float = 0.002  # 美元
    max_tokens: int = 80_000
    description: str = ""


class ModelRegistry:
    """多模型注册表 — 管理可用模型和当前选定模型。

    线程安全。AgentLoop 通过 get_active() 获取当前模型。
    """

    def __init__(self) -> None:
        self._models: dict[str, ModelConfig] = {}
        self._active_id: str = ""
        self._lock = Lock()
        self._init_defaults()

    def _init_defaults(self) -> None:
        """初始化默认模型配置。"""
        from app.config import settings

        defaults = [
            ModelConfig(
                id="minimax-m3",
                name="MiniMax-M3",
                model="MiniMax-M3",
                base_url=settings.openai_base_url,
                description="默认 LLM，性价比高",
            ),
            ModelConfig(
                id="gpt-4o",
                name="GPT-4o",
                model="gpt-4o",
                base_url="",
                cost_per_1k_tokens=0.005,
                description="OpenAI GPT-4o，推理能力强",
            ),
            ModelConfig(
                id="deepseek-v3",
                name="DeepSeek-V3",
                model="deepseek-chat",
                base_url="https://api.deepseek.com/v1",
                cost_per_1k_tokens=0.001,
                description="DeepSeek V3，低成本高性价比",
            ),
        ]
        for m in defaults:
            self._models[m.id] = m

        # 默认激活匹配当前 settings.llm_model 的模型
        self._active_id = "minimax-m3"
        for m in defaults:
            if m.model == settings.llm_model:
                self._active_id = m.id
                break

    def register(self, config: ModelConfig) -> None:
        """注册一个模型。"""
        with self._lock:
            self._models[config.id] = config

    def select(self, model_id: str) -> bool:
        """选择当前使用的模型，返回是否成功。"""
        with self._lock:
            if model_id in self._models:
                self._active_id = model_id
                return True
            return False

    def get_active(self) -> ModelConfig | None:
        """获取当前选定的模型配置。"""
        with self._lock:
            return self._models.get(self._active_id)

    def list_all(self) -> list[dict[str, Any]]:
        """列出全部模型信息。"""
        with self._lock:
            return [
                {
                    "id": m.id,
                    "name": m.name,
                    "provider": m.provider,
                    "model": m.model,
                    "description": m.description,
                    "cost_per_1k_tokens": m.cost_per_1k_tokens,
                    "is_active": m.id == self._active_id,
                }
                for m in self._models.values()
            ]

    def get_active_id(self) -> str:
        """获取当前选定模型的 ID。"""
        with self._lock:
            return self._active_id


# 全局单例
model_registry = ModelRegistry()

"""多模型注册表测试（V3-F3）。"""

from __future__ import annotations

from app.llm.model_registry import ModelConfig, ModelRegistry


def test_default_models():
    """默认注册表包含预置模型。"""
    reg = ModelRegistry()
    models = reg.list_all()
    assert len(models) >= 3
    ids = [m["id"] for m in models]
    assert "minimax-m3" in ids
    assert "gpt-4o" in ids


def test_select_model():
    """切换当前模型。"""
    reg = ModelRegistry()
    assert reg.select("gpt-4o") is True
    active = reg.get_active()
    assert active is not None
    assert active.id == "gpt-4o"


def test_select_nonexistent():
    """选择不存在的模型返回 False。"""
    reg = ModelRegistry()
    assert reg.select("nonexistent") is False


def test_register_custom():
    """注册自定义模型。"""
    reg = ModelRegistry()
    reg.register(
        ModelConfig(
            id="custom-model",
            name="Custom",
            model="custom-v1",
            description="自定义模型",
        )
    )
    models = reg.list_all()
    assert any(m["id"] == "custom-model" for m in models)


def test_active_marker():
    """list_all 中 is_active 标记正确。"""
    reg = ModelRegistry()
    reg.select("gpt-4o")
    models = reg.list_all()
    active_models = [m for m in models if m["is_active"]]
    assert len(active_models) == 1
    assert active_models[0]["id"] == "gpt-4o"

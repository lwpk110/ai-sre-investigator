# TDD 工作流 (Test-Driven Development)

> 适用于所有功能开发与 bug 修复。基于已安装的 `test-driven-development` skill,针对本项目适配。

---

## 铁律

```
没有先写失败的测试,就不写生产代码。
```

先写了实现代码?删掉,从头来。不留"参考",不"适配"。

---

## Red-Green-Refactor 循环

每个功能点都走以下三步:

### 1. RED — 先写一个失败的测试

写一个最小的测试,描述期望行为:

```python
# tests/unit/ql/test_promql_validator.py
async def test_promql_validator_rejects_unclosed_bracket():
    result = validate_promql('rate(http_requests_total[5m', catalog=mock_catalog)
    assert not result.ok
    assert result.error_type == "SYNTAX_ERROR"
```

要求:
- 测试名描述真实行为,不写 `test_validator_1`
- 一个测试只测一个行为,名字里有 "and" 就拆
- 用真实代码,不 mock 被测对象本身
- 后端交互用 mock(httpx / respx),不连真实 Mimir/Loki

### 2. 验证 RED — 跑测试,确认它失败

```bash
cd backend && pytest tests/unit/ql/test_promql_validator.py -v
```

确认:
- 测试 **失败**(不是报错 ImportError)
- 失败原因正确(功能缺失,不是拼写错误)
- 测试通过了?说明在测已有行为,修改测试

### 3. GREEN — 写最少的代码让测试通过

```python
# tools/ql/promql.py
def validate_promql(query: str, catalog: MetricCatalog) -> ValidationResult:
    if query.count('[') != query.count(']'):
        return ValidationResult(ok=False, error_type="SYNTAX_ERROR",
                                message="括号未闭合")
    return ValidationResult(ok=True)
```

不要加额外功能、不要重构其他代码、不要"顺手改进"。

### 4. 验证 GREEN — 跑测试,确认通过

```bash
pytest tests/unit/ql/test_promql_validator.py -v
# 确认全绿,无 warning
```

### 5. REFACTOR — 测试全绿后清理

- 消除重复、改善命名、提取辅助函数
- 每次重构后重跑测试,保持绿色
- 不添加新行为

---

## 本项目测试分层

| 层次 | 目录 | 测试内容 | 后端依赖 |
|------|------|----------|----------|
| 单元测试 | `tests/unit/` | QL 校验器、缓存 key 归一化、预算扣减、ToolSpec 契约 | 全 mock |
| 集成测试 | `tests/integration/` | 自修正闭环、混沌路径(5xx/timeout/429)、优雅收尾 | mock httpx |

**硬规则**:测试不依赖真实观测后端。Mimir/Loki/Tempo 一律 mock。

---

## 测试工具

- `pytest` + `pytest-asyncio`(async 测试)
- `respx` 或 `httpx.MockTransport` mock HTTPX 调用
- `pytest.fixture` 做测试数据工厂(真实 metric 目录、日志样本)

```python
# conftest.py
import pytest
from app.tools.catalog import MetricCatalog

@pytest.fixture
def mock_catalog() -> MetricCatalog:
    """模拟真实 Mimir metric 目录(来自 spike 真实数据)"""
    return MetricCatalog(
        metrics={"http_server_requests_count", "db_client_connections_usage"},
        labels_by_metric={"http_server_requests_count": {"application", "status"}},
    )
```

---

## Bug 修复流程

发现 bug 时:
1. **先写一个能复现 bug 的失败测试**
2. 确认测试失败(复现了 bug)
3. 修复代码让测试通过
4. 重跑全部测试确认无回归

不写测试直接修 bug = 没修。bug 会回来。

---

## 例外(需确认)

以下场景可以跳过 TDD,但需要团队/agent 确认:
- 配置文件(`pyproject.toml`、`.env.example`)
- 纯脚手架代码(`__init__.py`、`main.py` 的 app 实例化)
- 一次性探索脚本(spike 目录)

除此之外,没有例外。"就这一次不写测试"是理性化,停下来。

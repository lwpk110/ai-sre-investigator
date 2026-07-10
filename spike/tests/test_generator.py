"""Test the LLM-based QL generator."""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from spike.dataset.metric_catalog import MetricCatalog
from spike.dataset.samples import SAMPLES, QLType
from spike.generator import generate_ql, build_system_prompt, parse_llm_response, GeneratedQL


class TestBuildSystemPrompt:
    def test_prompt_contains_catalog(self):
        catalog = MetricCatalog.default()
        prompt = build_system_prompt(catalog)
        assert "payment-service" in prompt
        assert "http_requests_total" in prompt

    def test_prompt_contains_instructions(self):
        catalog = MetricCatalog.default()
        prompt = build_system_prompt(catalog)
        assert "PromQL" in prompt or "promql" in prompt.lower()
        assert "LogQL" in prompt or "logql" in prompt.lower()
        assert "TraceQL" in prompt or "traceql" in prompt.lower()


class TestParseLLMResponse:
    def test_parses_clean_query(self):
        resp = '```promql\nsum(rate(http_requests_total{service="x"}[1h]))\n```'
        result = parse_llm_response(resp, QLType.PROMQL)
        assert "http_requests_total" in result

    def test_parses_plain_text_query(self):
        resp = 'sum(rate(http_requests_total{service="x"}[1h]))'
        result = parse_llm_response(resp, QLType.PROMQL)
        assert "http_requests_total" in result

    def test_parses_with_extra_text(self):
        resp = 'Here is the query:\n```logql\n{service="x"} |= "error"\n```\nHope this helps!'
        result = parse_llm_response(resp, QLType.LOGQL)
        assert '{service="x"}' in result
        assert "Hope" not in result


class TestGenerateQL:
    @pytest.mark.asyncio
    async def test_generate_returns_generated_ql(self):
        catalog = MetricCatalog.default()
        sample = SAMPLES[0]
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = '```promql\nsum(rate(http_requests_total{service="payment-service"}[1h]))\n```'
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

        result = await generate_ql(sample, catalog, mock_client, model="test-model")
        assert isinstance(result, GeneratedQL)
        assert result.sample_id == sample.id
        assert "http_requests_total" in result.query
        assert result.model == "test-model"

    @pytest.mark.asyncio
    async def test_generate_calls_client_with_messages(self):
        catalog = MetricCatalog.default()
        sample = SAMPLES[0]
        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.choices = [MagicMock()]
        mock_resp.choices[0].message.content = "rate(http_requests_total[1h])"
        mock_client.chat.completions.create = AsyncMock(return_value=mock_resp)

        await generate_ql(sample, catalog, mock_client, model="test-model")
        mock_client.chat.completions.create.assert_called_once()
        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert "messages" in call_kwargs
        assert len(call_kwargs["messages"]) >= 2  # system + user

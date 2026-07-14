import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventRow } from "../EventRow";

describe("EventRow", () => {
  it("tool_call 类型渲染 info 色 badge", () => {
    render(<EventRow type="tool_call" code>{`{"tool":"mimir-query"}`}</EventRow>);
    const badge = screen.getByText("tool_call");
    expect(badge.className).toContain("bg-info-bg");
    expect(badge.className).toContain("text-info");
  });

  it("self_heal 类型渲染 warn 色 badge", () => {
    render(<EventRow type="self_heal">自动重试</EventRow>);
    expect(screen.getByText("self_heal").className).toContain("bg-warning-bg");
  });

  it("analysis 类型渲染 ok 色 badge", () => {
    render(<EventRow type="analysis" code>{`{"finding":"..."}`}</EventRow>);
    expect(screen.getByText("analysis").className).toContain("bg-success-bg");
  });

  it("rca 类型渲染 purple 色 badge", () => {
    render(<EventRow type="rca">根因分析</EventRow>);
    expect(screen.getByText("rca").className).toContain("bg-purple-bg");
  });

  it("code=true 渲染代码块样式", () => {
    render(<EventRow type="tool_call" code>{`{"tool":"x"}`}</EventRow>);
    const content = screen.getByText(`{"tool":"x"}`);
    expect(content.className).toContain("bg-code-bg");
    expect(content.className).toContain("font-mono");
  });

  it("code=false 渲染文本样式（无 bg-code-bg）", () => {
    render(<EventRow type="self_heal">重试中</EventRow>);
    const content = screen.getByText("重试中");
    expect(content.className).not.toContain("bg-code-bg");
    expect(content.className).toContain("text-text-secondary");
  });

  it("className prop 可合并", () => {
    const { container } = render(
      <EventRow type="rca" className="extra">内容</EventRow>,
    );
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

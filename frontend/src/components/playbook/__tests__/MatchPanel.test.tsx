import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MatchPanel } from "../MatchPanel";

describe("MatchPanel", () => {
  it("渲染标题", () => {
    render(<MatchPanel />);
    expect(screen.getByText("剧本匹配")).toBeInTheDocument();
  });

  it("未提供 placeholder 时使用默认值", () => {
    render(<MatchPanel />);
    expect(
      screen.getByPlaceholderText("输入症状关键词，如 OOMKill、延迟飙升、5xx 告警…"),
    ).toBeInTheDocument();
  });

  it("自定义 placeholder", () => {
    render(<MatchPanel placeholder="自定义提示" />);
    expect(screen.getByPlaceholderText("自定义提示")).toBeInTheDocument();
  });

  it("点击匹配按钮触发 onMatch 回调", () => {
    const onMatch = vi.fn();
    render(<MatchPanel onMatch={onMatch} />);
    const input = screen.getByPlaceholderText(/OOMKill/);
    fireEvent.change(input, { target: { value: "内存泄漏" } });
    fireEvent.click(screen.getByText("匹配"));
    expect(onMatch).toHaveBeenCalledWith("内存泄漏");
  });

  it("defaultValue 初始值", () => {
    render(<MatchPanel defaultValue="P99 延迟" />);
    expect((screen.getByPlaceholderText(/OOMKill/) as HTMLInputElement).value).toBe("P99 延迟");
  });

  it("包含 surface 和 border class", () => {
    const { container } = render(<MatchPanel />);
    const panel = container.firstChild as HTMLElement;
    expect(panel.className).toContain("bg-surface-1");
    expect(panel.className).toContain("rounded-md");
  });

  it("className prop 可合并", () => {
    const { container } = render(<MatchPanel className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeBlock } from "../CodeBlock";

// mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: vi.fn() },
});

describe("CodeBlock", () => {
  it("渲染代码内容", () => {
    render(<CodeBlock>{"rate(http_requests_total[5m])"}</CodeBlock>);
    expect(screen.getByText("rate(http_requests_total[5m])")).toBeInTheDocument();
  });

  it("包含 code-bg 和 mono class", () => {
    const { container } = render(<CodeBlock>{"query"}</CodeBlock>);
    const block = container.firstChild as HTMLElement;
    expect(block.className).toContain("bg-code-bg");
  });

  it("有 label 时显示标签", () => {
    render(<CodeBlock label="PromQL">{"query"}</CodeBlock>);
    expect(screen.getByText("PromQL")).toBeInTheDocument();
  });

  it("无 label 时不渲染 label 区域", () => {
    const { container } = render(<CodeBlock>{"query"}</CodeBlock>);
    expect(container.querySelector('[data-testid="codeblock-label"]')).toBeNull();
  });

  it("copyable 时渲染复制按钮", () => {
    render(<CodeBlock copyable>{"query"}</CodeBlock>);
    expect(screen.getByRole("button", { name: /复制/i })).toBeInTheDocument();
  });

  it("无 copyable 时不渲染复制按钮", () => {
    render(<CodeBlock>{"query"}</CodeBlock>);
    expect(screen.queryByRole("button", { name: /复制/i })).toBeNull();
  });

  it("className prop 可合并", () => {
    const { container } = render(<CodeBlock className="mt-2">{"query"}</CodeBlock>);
    expect((container.firstChild as HTMLElement).className).toContain("mt-2");
  });
});

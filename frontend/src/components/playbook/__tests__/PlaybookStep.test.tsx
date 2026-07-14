import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaybookStep } from "../PlaybookStep";

describe("PlaybookStep", () => {
  const defaultProps = {
    stepNumber: 1,
    toolLabel: "Mimir",
    toolVariant: "warn" as const,
    label: "指标确认",
    purpose: "查询 payment-service 的 P99 延迟趋势",
  };

  it("渲染 step 序号", () => {
    render(<PlaybookStep {...defaultProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("渲染 tool badge 标签", () => {
    render(<PlaybookStep {...defaultProps} />);
    expect(screen.getByText("Mimir")).toBeInTheDocument();
  });

  it("渲染 step label", () => {
    render(<PlaybookStep {...defaultProps} />);
    expect(screen.getByText("指标确认")).toBeInTheDocument();
  });

  it("渲染 purpose", () => {
    render(<PlaybookStep {...defaultProps} />);
    expect(screen.getByText("查询 payment-service 的 P99 延迟趋势")).toBeInTheDocument();
  });

  it("提供 query 时渲染 CodeBlock", () => {
    render(<PlaybookStep {...defaultProps} query="histogram_quantile(0.99, ...)" queryLabel="PromQL" />);
    expect(screen.getByText("histogram_quantile(0.99, ...)")).toBeInTheDocument();
    expect(screen.getByText("PromQL")).toBeInTheDocument();
  });

  it("未提供 query 时不渲染 CodeBlock", () => {
 render(<PlaybookStep {...defaultProps} />);
    expect(screen.queryByTestId("codeblock-label")).not.toBeInTheDocument();
  });

  it("className prop 可合并", () => {
    const { container } = render(<PlaybookStep {...defaultProps} className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchResult } from "../MatchResult";

describe("MatchResult", () => {
  const defaultProps = {
    priorityLabel: "P0",
    priorityVariant: "err" as const,
    name: "高延迟根因分析",
    steps: 4,
    matchPercent: 92,
    description: "针对微服务延迟异常的标准排查流程",
    keywords: [
      { label: "latency", variant: "warn" as const },
      { label: "P99", variant: "info" as const },
      { label: "timeout", variant: "ok" as const },
      { label: "upstream", variant: "purple" as const },
    ],
  };

  it("渲染 priority badge", () => {
    render(<MatchResult {...defaultProps} />);
    expect(screen.getByText("P0")).toBeInTheDocument();
  });

  it("渲染 name", () => {
    render(<MatchResult {...defaultProps} />);
    expect(screen.getByText("高延迟根因分析")).toBeInTheDocument();
  });

  it("渲染 steps 和 match 百分比", () => {
    render(<MatchResult {...defaultProps} />);
    expect(screen.getByText(/4 steps/)).toBeInTheDocument();
    expect(screen.getByText(/92% match/)).toBeInTheDocument();
  });

  it("渲染 description", () => {
    render(<MatchResult {...defaultProps} />);
    expect(screen.getByText("针对微服务延迟异常的标准排查流程")).toBeInTheDocument();
  });

  it("渲染所有 keywords", () => {
    render(<MatchResult {...defaultProps} />);
    ["latency", "P99", "timeout", "upstream"].forEach((kw) => {
      expect(screen.getByText(kw)).toBeInTheDocument();
    });
  });

  it("className prop 可合并", () => {
    const { container } = render(<MatchResult {...defaultProps} className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

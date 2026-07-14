import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("渲染 children", () => {
    render(<Badge>P0</Badge>);
    expect(screen.getByText("P0")).toBeInTheDocument();
  });

  it("default 变体包含中性色 class", () => {
    render(<Badge>默认</Badge>);
    const badge = screen.getByText("默认");
    expect(badge.className).toContain("bg-white/[0.05]");
    expect(badge.className).toContain("text-text-secondary");
  });

  it("ok 变体包含 success 色", () => {
    render(<Badge variant="ok">成功</Badge>);
    const badge = screen.getByText("成功");
    expect(badge.className).toContain("bg-success-bg");
    expect(badge.className).toContain("text-success");
  });

  it("err 变体包含 error 色", () => {
    render(<Badge variant="err">P0</Badge>);
    const badge = screen.getByText("P0");
    expect(badge.className).toContain("bg-error-bg");
    expect(badge.className).toContain("text-error");
  });

  it("warn 变体包含 warning 色", () => {
    render(<Badge variant="warn">P1</Badge>);
    const badge = screen.getByText("P1");
    expect(badge.className).toContain("bg-warning-bg");
    expect(badge.className).toContain("text-warning");
  });

  it("info 变体包含 info 色", () => {
    render(<Badge variant="info">PromQL</Badge>);
    const badge = screen.getByText("PromQL");
    expect(badge.className).toContain("bg-info-bg");
    expect(badge.className).toContain("text-info");
  });

  it("purple 变体包含 purple 色", () => {
    render(<Badge variant="purple">memory</Badge>);
    const badge = screen.getByText("memory");
    expect(badge.className).toContain("bg-purple-bg");
    expect(badge.className).toContain("text-purple");
  });

  it("className prop 可合并", () => {
    render(<Badge className="ml-2">额外</Badge>);
    expect(screen.getByText("额外").className).toContain("ml-2");
  });
});

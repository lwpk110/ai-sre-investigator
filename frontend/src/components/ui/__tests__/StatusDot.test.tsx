import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatusDot } from "../StatusDot";

describe("StatusDot", () => {
  it("ok 状态渲染 success 色", () => {
    const { container } = render(<StatusDot status="ok" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-success");
  });

  it("warn 状态渲染 warning 色", () => {
    const { container } = render(<StatusDot status="warn" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-warning");
  });

  it("err 状态渲染 error 色", () => {
    const { container } = render(<StatusDot status="err" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-error");
  });

  it("info 状态渲染 info 色", () => {
    const { container } = render(<StatusDot status="info" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-info");
  });

  it("running 状态渲染 info 色 + 脉冲动画", () => {
    const { container } = render(<StatusDot status="running" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("bg-info");
    expect(dot.className).toContain("animate-status-pulse");
  });

  it("固定尺寸 8px", () => {
    const { container } = render(<StatusDot status="ok" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("w-2");
    expect(dot.className).toContain("h-2");
  });

  it("className prop 可合并", () => {
    const { container } = render(<StatusDot status="ok" className="mt-1" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain("mt-1");
  });
});

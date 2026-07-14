import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toggle } from "../Toggle";

describe("Toggle", () => {
  it("enabled=true 显示 ENABLED 文本", () => {
    render(<Toggle enabled />);
    expect(screen.getByText("ENABLED")).toBeInTheDocument();
  });

  it("enabled=false 显示 DISABLED 文本", () => {
    render(<Toggle enabled={false} />);
    expect(screen.getByText("DISABLED")).toBeInTheDocument();
  });

  it("enabled=true 使用 success 色", () => {
    render(<Toggle enabled />);
    const toggle = screen.getByText("ENABLED").closest("button")!;
    expect(toggle.className).toContain("bg-success-bg");
    expect(toggle.className).toContain("text-success");
  });

  it("enabled=false 使用 muted 色", () => {
    render(<Toggle enabled={false} />);
    const toggle = screen.getByText("DISABLED").closest("button")!;
    expect(toggle.className).toContain("bg-white/[0.04]");
    expect(toggle.className).toContain("text-text-quaternary");
  });

  it("点击触发 onClick 回调", () => {
    const onClick = vi.fn();
    render(<Toggle enabled onClick={onClick} />);
    fireEvent.click(screen.getByText("ENABLED"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("包含圆点标记", () => {
    const { container } = render(<Toggle enabled />);
    const dot = container.querySelector("span.rounded-full");
    expect(dot).toBeTruthy();
  });

  it("className prop 可合并", () => {
    render(<Toggle enabled className="extra" />);
    const toggle = screen.getByText("ENABLED").closest("button")!;
    expect(toggle.className).toContain("extra");
  });
});

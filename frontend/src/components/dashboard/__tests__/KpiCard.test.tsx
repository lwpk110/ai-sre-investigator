import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RefreshCw } from "lucide-react";
import { KpiCard } from "../KpiCard";

describe("KpiCard", () => {
  const defaultProps = {
    icon: <RefreshCw size={16} />,
    iconVariant: "ok" as const,
    label: "自闭环率",
    value: "67.3%",
  };

  it("渲染 label 和 value", () => {
    render(<KpiCard {...defaultProps} />);
    expect(screen.getByText("自闭环率")).toBeInTheDocument();
    expect(screen.getByText("67.3%")).toBeInTheDocument();
  });

  it("包含 surface 和 border class", () => {
    const { container } = render(<KpiCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("bg-surface-1");
    expect(card.className).toContain("border-border-subtle");
    expect(card.className).toContain("rounded-md");
    expect(card.className).toContain("p-4");
  });

  it("hover 态包含 transition + 高亮 class", () => {
    const { container } = render(<KpiCard {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("transition-colors");
    expect(card.className).toContain("hover:border-border-emphasis");
    expect(card.className).toContain("hover:bg-surface-2");
  });

  it("渲染 icon 在图标容器中", () => {
    const { container } = render(<KpiCard {...defaultProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("ok 变体 — 图标容器应用 success 色", () => {
    const { container } = render(<KpiCard {...defaultProps} iconVariant="ok" />);
    const iconBox = container.querySelector("svg")?.parentElement;
    expect(iconBox?.className).toContain("bg-success-bg");
    expect(iconBox?.className).toContain("text-success");
  });

  it("info 变体 — 图标容器应用 info 色", () => {
    const { container } = render(<KpiCard {...defaultProps} iconVariant="info" />);
    const iconBox = container.querySelector("svg")?.parentElement;
    expect(iconBox?.className).toContain("bg-info-bg");
    expect(iconBox?.className).toContain("text-info");
  });

  it("accent 变体 — 图标容器应用 accent 色", () => {
    const { container } = render(<KpiCard {...defaultProps} iconVariant="accent" />);
    const iconBox = container.querySelector("svg")?.parentElement;
    expect(iconBox?.className).toContain("bg-accent-muted-bg");
    expect(iconBox?.className).toContain("text-accent");
  });

  it("warn 变体 — 图标容器应用 warning 色", () => {
    const { container } = render(<KpiCard {...defaultProps} iconVariant="warn" />);
    const iconBox = container.querySelector("svg")?.parentElement;
    expect(iconBox?.className).toContain("bg-warning-bg");
    expect(iconBox?.className).toContain("text-warning");
  });

  it("purple 变体 — 图标容器应用 purple 色", () => {
    const { container } = render(<KpiCard {...defaultProps} iconVariant="purple" />);
    const iconBox = container.querySelector("svg")?.parentElement;
    expect(iconBox?.className).toContain("bg-purple-bg");
    expect(iconBox?.className).toContain("text-purple");
  });

  it("err 变体 — 图标容器应用 error 色", () => {
    const { container } = render(<KpiCard {...defaultProps} iconVariant="err" />);
    const iconBox = container.querySelector("svg")?.parentElement;
    expect(iconBox?.className).toContain("bg-error-bg");
    expect(iconBox?.className).toContain("text-error");
  });

  it("value 使用 mono 字体和 tabular-nums", () => {
    render(<KpiCard {...defaultProps} />);
    const value = screen.getByText("67.3%");
    expect(value.className).toContain("font-mono");
    expect(value.className).toContain("tabular-nums");
  });

  it("className prop 可合并", () => {
    const { container } = render(
      <KpiCard {...defaultProps} className="extra-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("extra-class");
  });
});

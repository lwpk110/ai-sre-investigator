import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelRow } from "../ModelRow";

describe("ModelRow", () => {
  const defaultProps = {
    name: "gpt-4o",
    description: "最强推理能力",
    meta: [
      { text: "128K ctx" },
      { text: "$2.5/1M in" },
      { text: "fast" },
    ],
  };

  it("渲染模型名称", () => {
    render(<ModelRow {...defaultProps} />);
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });

  it("提供 badge 时渲染标签", () => {
    render(
      <ModelRow {...defaultProps} badge={{ label: "推荐", variant: "ok" }} />,
    );
    expect(screen.getByText("推荐")).toBeInTheDocument();
  });

  it("未提供 badge 时不渲染标签", () => {
    render(<ModelRow {...defaultProps} />);
    expect(screen.queryByText("推荐")).not.toBeInTheDocument();
  });

  it("渲染描述", () => {
    render(<ModelRow {...defaultProps} />);
    expect(screen.getByText("最强推理能力")).toBeInTheDocument();
  });

  it("渲染所有 meta 条目", () => {
    render(<ModelRow {...defaultProps} />);
    expect(screen.getByText("128K ctx")).toBeInTheDocument();
    expect(screen.getByText("$2.5/1M in")).toBeInTheDocument();
    expect(screen.getByText("fast")).toBeInTheDocument();
  });

  it("active=true 显示选中态 radio", () => {
    const { container } = render(<ModelRow {...defaultProps} active />);
    const radio = container.querySelector('[class*="border-accent"]');
    expect(radio).toBeTruthy();
  });

  it("active=false 显示未选中态 radio", () => {
    const { container } = render(<ModelRow {...defaultProps} />);
    const radio = container.querySelector('[class*="border-border-emphasis"]');
    expect(radio).toBeTruthy();
  });

  it("点击触发 onSelect 回调", () => {
    const onSelect = vi.fn();
    render(<ModelRow {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("gpt-4o").closest("div")!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("className prop 可合并", () => {
    const { container } = render(<ModelRow {...defaultProps} className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

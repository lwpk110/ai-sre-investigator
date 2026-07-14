import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ListItem } from "../ListItem";

describe("ListItem", () => {
  const defaultProps = {
    status: "ok" as const,
    name: "mimir-distributor",
    description: "distributor · 6 replicas · healthy",
  };

  it("渲染 name 和 description", () => {
    render(<ListItem {...defaultProps} />);
    expect(screen.getByText("mimir-distributor")).toBeInTheDocument();
    expect(screen.getByText("distributor · 6 replicas · healthy")).toBeInTheDocument();
  });

  it("包含 surface 和 border class", () => {
    const { container } = render(<ListItem {...defaultProps} />);
    const item = container.firstChild as HTMLElement;
    expect(item.className).toContain("bg-surface-1");
    expect(item.className).toContain("rounded-md");
    expect(item.className).toContain("overflow-hidden");
  });

  it("ok 状态渲染 success 色圆点", () => {
    const { container } = render(<ListItem {...defaultProps} status="ok" />);
    const dot = container.querySelector('[class*="bg-success"]');
    expect(dot).toBeTruthy();
  });

  it("warn 状态渲染 warning 色圆点", () => {
    const { container } = render(<ListItem {...defaultProps} status="warn" />);
    const dot = container.querySelector('[class*="bg-warning"]');
    expect(dot).toBeTruthy();
  });

  it("err 状态渲染 error 色圆点", () => {
    const { container } = render(<ListItem {...defaultProps} status="err" />);
    const dot = container.querySelector('[class*="bg-error"]');
    expect(dot).toBeTruthy();
  });

  it("默认折叠 — body 不可见", () => {
    render(<ListItem {...defaultProps}>展开内容</ListItem>);
    expect(screen.queryByText("展开内容")).not.toBeInTheDocument();
  });

  it("defaultOpen=true — body 初始可见", () => {
    render(<ListItem {...defaultProps} defaultOpen>展开内容</ListItem>);
    expect(screen.getByText("展开内容")).toBeInTheDocument();
  });

  it("点击 header 切换展开状态", () => {
    render(<ListItem {...defaultProps}>展开内容</ListItem>);
    expect(screen.queryByText("展开内容")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("mimir-distributor"));
    expect(screen.getByText("展开内容")).toBeInTheDocument();
    fireEvent.click(screen.getByText("mimir-distributor"));
    expect(screen.queryByText("展开内容")).not.toBeInTheDocument();
  });

  it("展开时 chevron 旋转 90 度", () => {
    const { container } = render(
      <ListItem {...defaultProps} defaultOpen>
        <span>内容</span>
      </ListItem>,
    );
    const chevron = container.querySelector("svg");
    expect(chevron?.getAttribute("class")).toContain("rotate-90");
  });

  it("className prop 可合并", () => {
    const { container } = render(<ListItem {...defaultProps} className="extra-class" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra-class");
  });
});

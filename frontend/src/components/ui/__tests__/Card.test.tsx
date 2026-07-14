import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../Card";

describe("Card", () => {
  it("渲染 children", () => {
    render(<Card>卡片内容</Card>);
    expect(screen.getByText("卡片内容")).toBeInTheDocument();
  });

  it("包含 surface 和 border class", () => {
    const { container } = render(<Card>内容</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("bg-surface-1");
    expect(card.className).toContain("border");
    expect(card.className).toContain("border-border-subtle");
    expect(card.className).toContain("rounded-md");
  });

  it("loading 状态不渲染 children，显示 skeleton", () => {
    const { container } = render(<Card loading>加载中内容</Card>);
    expect(screen.queryByText("加载中内容")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("empty 状态不渲染 children，显示空提示", () => {
    render(<Card empty emptyText="暂无数据">内容</Card>);
    expect(screen.queryByText("内容")).not.toBeInTheDocument();
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("error 状态显示错误信息", () => {
    render(<Card error="加载失败">正常内容</Card>);
    expect(screen.queryByText("正常内容")).not.toBeInTheDocument();
    expect(screen.getByText("加载失败")).toBeInTheDocument();
  });

  it("error 优先于 loading", () => {
    render(<Card error="错误" loading>内容</Card>);
    expect(screen.getByText("错误")).toBeInTheDocument();
    expect(screen.queryByText("内容")).not.toBeInTheDocument();
  });

  it("className prop 可合并", () => {
    const { container } = render(<Card className="mb-4">内容</Card>);
    expect((container.firstChild as HTMLElement).className).toContain("mb-4");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";

describe("Button", () => {
  it("渲染 children", () => {
    render(<Button>测试按钮</Button>);
    expect(screen.getByText("测试按钮")).toBeInTheDocument();
  });

  it("primary 变体包含正确 class", () => {
    render(<Button variant="primary">主按钮</Button>);
    const btn = screen.getByText("主按钮").closest("button");
    expect(btn?.className).toContain("bg-accent");
    expect(btn?.className).toContain("text-white");
  });

  it("ghost 变体包含边框 class", () => {
    render(<Button variant="ghost">幽灵按钮</Button>);
    const btn = screen.getByText("幽灵按钮").closest("button");
    expect(btn?.className).toContain("border");
    expect(btn?.className).toContain("border-border-standard");
  });

  it("icon 变体是正方形", () => {
    render(<Button variant="icon" aria-label="删除">X</Button>);
    const btn = screen.getByLabelText("删除");
    expect(btn.className).toContain("w-8");
    expect(btn.className).toContain("h-8");
  });

  it("sm size 包含小字体 class", () => {
    render(<Button size="sm">小按钮</Button>);
    const btn = screen.getByText("小按钮").closest("button");
    expect(btn?.className).toContain("text-caption");
  });

  it("点击触发 onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>点击</Button>);
    await user.click(screen.getByText("点击"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled 时不可点击", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>禁用</Button>);
    await user.click(screen.getByText("禁用"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("className prop 合并到组件", () => {
    render(<Button className="ml-4">自定义</Button>);
    const btn = screen.getByText("自定义").closest("button");
    expect(btn?.className).toContain("ml-4");
  });
});

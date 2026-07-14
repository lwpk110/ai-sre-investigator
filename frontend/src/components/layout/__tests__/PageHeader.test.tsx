import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Server } from "lucide-react";
import { PageHeader } from "../PageHeader";

describe("PageHeader", () => {
  it("渲染标题", () => {
    render(<PageHeader icon={<Server />} title="服务目录" />);
    expect(screen.getByText("服务目录")).toBeInTheDocument();
  });

  it("标题是 h1 且有正确 class", () => {
    render(<PageHeader icon={<Server />} title="测试" />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("text-page-title");
    expect(h1.className).toContain("font-semibold");
  });

  it("渲染 count 计数标签", () => {
    render(<PageHeader icon={<Server />} title="服务" count="12 个服务" />);
    expect(screen.getByText("12 个服务")).toBeInTheDocument();
  });

  it("渲染 actions 操作区", () => {
    render(
      <PageHeader icon={<Server />} title="服务" actions={<button>刷新</button>} />
    );
    expect(screen.getByText("刷新")).toBeInTheDocument();
  });

  it("count 和 actions 同时存在时都渲染", () => {
    render(
      <PageHeader
        icon={<Server />}
        title="服务"
        count="12"
        actions={<button>操作</button>}
      />
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("操作")).toBeInTheDocument();
  });

  it("className prop 可合并", () => {
    const { container } = render(<PageHeader icon={<Server />} title="测试" className="mt-4" />);
    expect((container.firstChild as HTMLElement).className).toContain("mt-4");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BriefCard } from "../BriefCard";

describe("BriefCard", () => {
  const mockItems = [
    "prod-api-5f2c 内存泄漏触发 OOM，已自动回滚至 v2.3.1",
    "Redis 集群 redis-03 延迟飙升至 340ms，热缓存重建完成",
    "支付网关超时率 0.3% → 2.1%，根因 DB 连接池耗尽",
    "CDN 边缘节点 sjc02 回源率异常，已切换备份源站",
  ];

  it("渲染默认 title", () => {
    render(<BriefCard items={mockItems} />);
    expect(screen.getByText("最新简报")).toBeInTheDocument();
  });

  it("自定义 title", () => {
    render(<BriefCard title="今日告警" items={mockItems} />);
    expect(screen.getByText("今日告警")).toBeInTheDocument();
  });

  it("根据 items 长度渲染条数", () => {
    render(<BriefCard items={mockItems} />);
    expect(screen.getByText("4 条")).toBeInTheDocument();
  });

  it("渲染所有简报条目", () => {
    render(<BriefCard items={mockItems} />);
    mockItems.forEach((text) => {
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  it("空 items 渲染 0 条且无条目", () => {
    render(<BriefCard items={[]} />);
    expect(screen.getByText("0 条")).toBeInTheDocument();
  });

  it("包含 surface 和 border class", () => {
    const { container } = render(<BriefCard items={mockItems} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("bg-surface-1");
    expect(card.className).toContain("border-border-subtle");
    expect(card.className).toContain("rounded-md");
  });

  it("每个条目包含圆点标记", () => {
    const { container } = render(<BriefCard items={mockItems} />);
    // 圆点是 bg-accent 的 span 元素
    const dots = container.querySelectorAll(".bg-accent");
    expect(dots).toHaveLength(4);
  });

  it("className prop 可合并", () => {
    const { container } = render(
      <BriefCard items={mockItems} className="extra-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("extra-class");
  });
});

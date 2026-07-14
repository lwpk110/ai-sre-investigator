import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart } from "../TrendChart";

describe("TrendChart", () => {
  const mockData = [
    { value: 12, date: "07/08" },
    { value: 25, date: "07/11" },
    { value: 8, date: "07/10" },
  ];

  it("渲染 title 和 meta", () => {
    render(<TrendChart title="会话趋势" meta="近 7 天" data={mockData} />);
    expect(screen.getByText("会话趋势")).toBeInTheDocument();
    expect(screen.getByText("近 7 天")).toBeInTheDocument();
  });

  it("未提供 title 时使用默认值", () => {
    render(<TrendChart data={mockData} />);
    expect(screen.getByText("会话趋势")).toBeInTheDocument();
  });

  it("未提供 meta 时不渲染 meta 文本", () => {
    render(<TrendChart data={mockData} />);
    expect(screen.queryByText("近 7 天")).not.toBeInTheDocument();
  });

  it("根据 data 渲染正确数量的柱子", () => {
    const { container } = render(<TrendChart data={mockData} />);
    // 每个柱子由一个带 inline style 的 fill div 表示
    const fills = container.querySelectorAll("[style]");
    expect(fills).toHaveLength(3);
  });

  it("根据最大值计算柱高百分比", () => {
    const { container } = render(<TrendChart data={mockData} />);
    const fills = container.querySelectorAll("[style]");
    // max = 25, 所以 12/25=48%, 25/25=100%, 8/25=32%
    expect((fills[0] as HTMLElement).style.height).toBe("48%");
    expect((fills[1] as HTMLElement).style.height).toBe("100%");
    expect((fills[2] as HTMLElement).style.height).toBe("32%");
  });

  it("渲染所有 date 标签", () => {
    render(<TrendChart data={mockData} />);
    expect(screen.getByText("07/08")).toBeInTheDocument();
    expect(screen.getByText("07/10")).toBeInTheDocument();
    expect(screen.getByText("07/11")).toBeInTheDocument();
  });

  it("渲染所有 value 数字", () => {
    render(<TrendChart data={mockData} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("空 data 不崩溃", () => {
    const { container } = render(<TrendChart data={[]} />);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });

  it("className prop 可合并", () => {
    const { container } = render(
      <TrendChart data={mockData} className="extra-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("extra-class");
  });
});

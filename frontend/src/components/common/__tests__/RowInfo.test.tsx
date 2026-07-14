import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapPin } from "lucide-react";
import { RowInfo } from "../RowInfo";

describe("RowInfo", () => {
  it("渲染 label 和 value", () => {
    render(<RowInfo label="Region" value="us-east-1" />);
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
  });

  it("传入 icon 时渲染 svg", () => {
    const { container } = render(
      <RowInfo label="Region" value="us-east-1" icon={<MapPin size={15} />} />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("未传 icon 时不渲染 svg", () => {
    const { container } = render(<RowInfo label="Region" value="us-east-1" />);
    expect(container.querySelector("svg")).toBeFalsy();
  });

  it("value 使用 mono 字体", () => {
    render(<RowInfo label="P99" value="89ms" />);
    const value = screen.getByText("89ms");
    expect(value.className).toContain("font-mono");
  });

  it("className prop 可合并", () => {
    const { container } = render(
      <RowInfo label="X" value="Y" className="extra" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

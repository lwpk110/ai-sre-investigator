import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBar } from "../SearchBar";

describe("SearchBar", () => {
  it("渲染 input 元素", () => {
    render(<SearchBar placeholder="搜索…" />);
    expect(screen.getByPlaceholderText("搜索…")).toBeInTheDocument();
  });

  it("未提供 placeholder 时使用默认值", () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText("搜索…")).toBeInTheDocument();
  });

  it("onChange 回调传入输入值", () => {
    const onChange = vi.fn();
    render(<SearchBar onChange={onChange} />);
    const input = screen.getByPlaceholderText("搜索…");
    fireEvent.change(input, { target: { value: "OOMKill" } });
    expect(onChange).toHaveBeenCalledWith("OOMKill");
  });

  it("受控模式 — value prop 映射到 input", () => {
    render(<SearchBar value="内存泄漏" onChange={() => {}} />);
    expect((screen.getByPlaceholderText("搜索…") as HTMLInputElement).value).toBe("内存泄漏");
  });

  it("提供 matchCount 时显示匹配数", () => {
    render(<SearchBar matchCount={12} matchHint="最近更新 2 小时前" />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText((c) => c.includes("最近更新"))).toBeInTheDocument();
  });

  it("未提供 matchCount 时不显示匹配提示", () => {
    render(<SearchBar />);
    expect(screen.queryByText("条结果")).not.toBeInTheDocument();
  });

  it("渲染搜索图标", () => {
    const { container } = render(<SearchBar />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("className prop 可合并", () => {
    const { container } = render(<SearchBar className="extra" />);
    expect((container.firstChild as HTMLElement).className).toContain("extra");
  });
});

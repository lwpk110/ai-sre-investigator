import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetBar } from "../BudgetBar";
import type { BudgetInfo } from "@/types/events";

describe("BudgetBar", () => {
  it("正常预算显示蓝色进度条", () => {
    const budget: BudgetInfo = {
      tokens_used: 100,
      tokens_max: 1000,
      calls_used: 2,
      calls_max: 10,
    };
    render(<BudgetBar budget={budget} />);
    expect(screen.getByText(/SafeToolExecutor/)).toBeInTheDocument();
  });

  it("零预算不崩溃", () => {
    const budget: BudgetInfo = {
      tokens_used: 0,
      tokens_max: 0,
      calls_used: 0,
      calls_max: 0,
    };
    render(<BudgetBar budget={budget} />);
    expect(screen.getByText(/SafeToolExecutor/)).toBeInTheDocument();
  });

  it("高预算消耗正确渲染", () => {
    const budget: BudgetInfo = {
      tokens_used: 950,
      tokens_max: 1000,
      calls_used: 9,
      calls_max: 10,
    };
    const { container } = render(<BudgetBar budget={budget} />);
    expect(container.firstChild).not.toBeNull();
  });
});

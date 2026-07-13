import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoGuide } from "../DemoGuide";

describe("DemoGuide", () => {
  it("渲染模拟故障场景列表", () => {
    const { container } = render(
      <DemoGuide onSelect={() => {}} onClose={() => {}} />
    );
    expect(container.textContent).toContain("HTTP 500");
  });

  it("渲染关闭按钮", () => {
    const { container } = render(
      <DemoGuide onSelect={() => {}} onClose={() => {}} />
    );
    // 第一个按钮应该是关闭按钮
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("点击关闭按钮调用 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <DemoGuide onSelect={() => {}} onClose={onClose} />
    );
    const closeBtn = container.querySelector("button");
    if (closeBtn) {
      await user.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

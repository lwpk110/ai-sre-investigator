import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInput } from "../ChatInput";

describe("ChatInput", () => {
  it("渲染输入框", () => {
    render(
      <ChatInput onSubmit={() => {}} disabled={false} placeholder="输入故障" />
    );
    expect(screen.getByPlaceholderText("输入故障")).toBeInTheDocument();
  });

  it("disabled 状态下禁用提交按钮", () => {
    const { container } = render(
      <ChatInput onSubmit={() => {}} disabled={true} placeholder="禁用态" />
    );
    // submit button 是第一个 button（在 textarea 容器内）
    const submitBtn = container.querySelector("textarea + button");
    expect(submitBtn).toBeDisabled();
  });

  it("输入文字后点击提交调用 onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(
      <ChatInput onSubmit={onSubmit} disabled={false} />
    );

    await user.type(screen.getByRole("textbox"), "payment-service 500 错误");
    const submitBtn = container.querySelector("textarea + button")!;
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith("payment-service 500 错误");
  });

  it("空消息时提交按钮被禁用", () => {
    const { container } = render(
      <ChatInput onSubmit={() => {}} disabled={false} />
    );
    const submitBtn = container.querySelector("textarea + button");
    expect(submitBtn).toBeDisabled();
  });

  it("渲染快捷模板", () => {
    render(<ChatInput onSubmit={() => {}} disabled={false} />);
    expect(screen.getByText("把 p99 拉长 3 小时")).toBeInTheDocument();
  });

  it("点击快捷模板直接提交", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} disabled={false} />);

    await user.click(screen.getByText("展开 TraceID 的下游"));
    expect(onSubmit).toHaveBeenCalledWith("展开 TraceID 的下游");
  });
});

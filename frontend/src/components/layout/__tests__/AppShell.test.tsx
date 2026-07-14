import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "../AppShell";

vi.mock("../NavList", () => ({
  NavList: () => React.createElement("nav", { "data-testid": "navlist" }, "nav"),
  defaultNavItems: [],
}));

describe("AppShell", () => {
  it("渲染 children 到 main 区域", () => {
    render(
      <AppShell>
        <div data-testid="page-content">页面内容</div>
      </AppShell>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("渲染 sidebar 区域", () => {
    render(<AppShell>内容</AppShell>);
    expect(screen.getByText("SRE Investigator")).toBeInTheDocument();
    expect(screen.getByTestId("navlist")).toBeInTheDocument();
  });

  it("main 区域有 780px 最大宽度", () => {
    const { container } = render(<AppShell>内容</AppShell>);
    const mainContent = container.querySelector('[data-testid="main-content"]') as HTMLElement;
    expect(mainContent).toBeTruthy();
    expect(mainContent.className).toContain("max-w-[780px]");
    expect(mainContent.className).toContain("mx-auto");
  });

  it("sidebar 有 260px 宽度", () => {
    const { container } = render(<AppShell>内容</AppShell>);
    const sidebar = container.querySelector('[data-testid="app-sidebar"]') as HTMLElement;
    expect(sidebar).toBeTruthy();
    expect(sidebar.className).toContain("w-[260px]");
  });

  it("footer 显示 Agent 在线状态", () => {
    render(<AppShell>内容</AppShell>);
    expect(screen.getByText("Agent 在线")).toBeInTheDocument();
  });

  it("sidebarBottom 自定义内容渲染", () => {
    render(
      <AppShell sidebarBottom={<div data-testid="custom-bottom">自定义底部</div>}>
        内容
      </AppShell>
    );
    expect(screen.getByTestId("custom-bottom")).toBeInTheDocument();
  });
});

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavList, type NavItem } from "../NavList";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

const testItems: NavItem[] = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/services", label: "服务目录", icon: "Server" },
  { href: "/tools", label: "工具管理", icon: "Wrench" },
];

describe("NavList", () => {
  it("渲染所有导航项", () => {
    render(<NavList items={testItems} />);
    expect(screen.getByText("仪表盘")).toBeInTheDocument();
    expect(screen.getByText("服务目录")).toBeInTheDocument();
    expect(screen.getByText("工具管理")).toBeInTheDocument();
  });

  it("当前路由项有 active class", () => {
    render(<NavList items={testItems} />);
    const activeLink = screen.getByText("仪表盘").closest("a");
    expect(activeLink?.className).toContain("bg-accent-muted-bg");
    expect(activeLink?.className).toContain("text-accent");
  });

  it("非当前路由项无 active class", () => {
    render(<NavList items={testItems} />);
    const inactiveLink = screen.getByText("服务目录").closest("a");
    expect(inactiveLink?.className).not.toContain("bg-accent-muted-bg");
  });

  it("每个导航项渲染为 Link", () => {
    render(<NavList items={testItems} />);
    const link = screen.getByText("仪表盘").closest("a");
    expect(link?.getAttribute("href")).toBe("/dashboard");
  });
});

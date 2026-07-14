"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Wrench,
  BookOpen,
  BookMarked,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

/** 图标名 -> Lucide 组件映射 */
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Server,
  Wrench,
  BookOpen,
  BookMarked,
  History,
  Settings,
};

/** 默认导航项（与原型一致） */
export const defaultNavItems: NavItem[] = [
  { href: "/dashboard", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/services", label: "服务目录", icon: "Server" },
  { href: "/tools", label: "工具管理", icon: "Wrench" },
  { href: "/knowledge", label: "知识库", icon: "BookOpen" },
  { href: "/playbooks", label: "剧本库", icon: "BookMarked" },
  { href: "/sessions", label: "会话历史", icon: "History" },
  { href: "/settings", label: "模型设置", icon: "Settings" },
];

interface NavListProps {
  items?: NavItem[];
}

export function NavList({ items = defaultNavItems }: NavListProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon] ?? LayoutDashboard;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 mb-0.5 rounded-sm text-small font-medium cursor-pointer transition-colors relative",
              isActive
                ? "bg-accent-muted-bg text-accent"
                : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent" />
            )}
            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-80")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

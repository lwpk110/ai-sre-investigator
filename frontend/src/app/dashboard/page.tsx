"use client";

import { Dashboard } from "@/components/Dashboard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--color-app-bg)" }}
    >
      <div className="max-w-[960px] mx-auto space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          返回排查
        </Link>
        <Dashboard />
      </div>
    </div>
  );
}

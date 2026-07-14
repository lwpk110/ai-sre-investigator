"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface CodeBlockProps {
  /** 语言标签（如 PromQL、LogQL、TraceQL），显示在左上角 */
  label?: string;
  /** 是否显示复制按钮 */
  copyable?: boolean;
  className?: string;
  children: ReactNode;
}

export function CodeBlock({
  label,
  copyable = false,
  className,
  children,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = typeof children === "string" ? children : String(children);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasHeader = Boolean(label || copyable);

  return (
    <div
      className={cn(
        "bg-code-bg border border-border-subtle rounded-sm overflow-hidden",
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle">
          {label ? (
            <span
              data-testid="codeblock-label"
              className="font-mono text-micro text-text-tertiary"
            >
              {label}
            </span>
          ) : (
            <span />
          )}
          {copyable && (
            <button
              onClick={handleCopy}
              className="text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="复制"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}
      <pre className="px-3 py-3 font-mono text-[12.5px] text-text-secondary leading-relaxed whitespace-pre overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}

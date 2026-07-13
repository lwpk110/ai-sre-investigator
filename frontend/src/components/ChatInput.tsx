"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}

/** 追问快捷模板 */
const quickTemplates = [
  "把 p99 拉长 3 小时",
  "展开 TraceID 的下游",
  "查看相关错误日志",
];

export function ChatInput({ onSubmit, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <div
        className="rounded-[var(--radius-md)] flex items-end gap-2 p-2.5 transition-colors focus-within:border-[rgba(94,138,255,0.3)]"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-standard)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || "描述故障现象，例如：payment-service 为什么大量 500？"}
          className="flex-1 bg-transparent outline-none resize-none text-[14px] leading-[1.5] placeholder:opacity-60"
          style={{ color: "var(--color-text-primary)", minHeight: "24px", maxHeight: "120px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[var(--radius-sm)] transition-colors disabled:opacity-40"
          style={{
            background: value.trim() && !disabled ? "var(--color-accent)" : "rgba(255,255,255,0.04)",
            color: value.trim() && !disabled ? "#ffffff" : "var(--color-text-tertiary)",
          }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {/* 快捷模板 */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {quickTemplates.map((tmpl) => (
          <button
            key={tmpl}
            onClick={() => !disabled && onSubmit(tmpl)}
            disabled={disabled}
            className="text-[11px] px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
            style={{
              color: "var(--color-text-tertiary)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--color-border-subtle)",
            }}
          >
            {tmpl}
          </button>
        ))}
      </div>
    </div>
  );
}

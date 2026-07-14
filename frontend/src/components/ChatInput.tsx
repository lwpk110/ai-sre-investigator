"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";

const quickTemplates = [
  "把 p99 拉长 3 小时",
  "展开 TraceID 的下游",
  "查看相关错误日志",
];

export function ChatInput({
  onSubmit,
  disabled,
  placeholder,
}: {
  onSubmit: (message: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
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

  const canSend = value.trim() && !disabled;

  return (
    <div>
      <div className="rounded-md flex items-end gap-2 p-2.5 transition-colors focus-within:border-accent/30 bg-surface-1 border border-border-standard">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || "描述故障现象，例如：payment-service 为什么大量 500？"}
          className="flex-1 bg-transparent outline-none resize-none text-body leading-relaxed placeholder:opacity-60 text-text-primary"
          style={{ minHeight: "24px", maxHeight: "120px" }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className={cn(
            "shrink-0 w-8 h-8 flex items-center justify-center rounded-sm transition-colors disabled:opacity-40",
            canSend ? "bg-accent text-white" : "bg-white/[0.04] text-text-tertiary",
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {quickTemplates.map((tmpl) => (
          <button
            key={tmpl}
            onClick={() => !disabled && onSubmit(tmpl)}
            disabled={disabled}
            className="text-micro px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 text-text-tertiary bg-white/[0.03] border border-border-subtle hover:border-border-standard"
          >
            {tmpl}
          </button>
        ))}
      </div>
    </div>
  );
}

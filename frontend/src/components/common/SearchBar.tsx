import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface SearchBarProps {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  /** 匹配结果数，提供时显示匹配提示 */
  matchCount?: number;
  /** 匹配提示后缀文本，如 "最近更新 2 小时前" */
  matchHint?: string;
  className?: string;
}

export function SearchBar({
  value,
  placeholder = "搜索…",
  onChange,
  matchCount,
  matchHint,
  className,
}: SearchBarProps) {
  return (
    <div className={className}>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
        />
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full bg-surface-1 border border-border-standard rounded-md pt-2.5 pr-3.5 pb-2.5 pl-[38px] text-small text-text-secondary font-sans outline-none transition-colors duration-100 placeholder:text-text-quaternary focus:border-accent"
        />
      </div>
      {matchCount !== undefined && (
        <p className="text-caption text-text-tertiary font-mono px-1 mt-2">
          匹配 <span className="text-accent font-semibold">{matchCount}</span> 条结果
          {matchHint && ` · ${matchHint}`}
        </p>
      )}
    </div>
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** 单日趋势数据点 */
interface TrendDataPoint {
  /** 会话数量 */
  value: number;
  /** 日期标签，如 "07/08" */
  date: string;
}

interface TrendChartProps extends HTMLAttributes<HTMLDivElement> {
  /** 图表标题，默认 "会话趋势" */
  title?: string;
  /** 右上角元信息，如 "近 7 天" */
  meta?: string;
  /** 趋势数据，按日期升序 */
  data: TrendDataPoint[];
}

export function TrendChart({
  title = "会话趋势",
  meta,
  data,
  className,
  ...props
}: TrendChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-subtle rounded-md p-5",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-small font-semibold text-text-secondary">{title}</span>
        {meta && (
          <span className="text-micro text-text-quaternary font-mono">{meta}</span>
        )}
      </div>
      <div className="flex items-end gap-3.5">
        {data.map((point, index) => {
 const percentage = (point.value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <span className="font-mono text-[10px] text-text-tertiary mb-1.5 tabular-nums">
                {point.value}
              </span>
              <div className="w-full h-[140px] bg-accent-muted-bg rounded-sm flex items-end overflow-hidden">
                <div
                  className="w-full bg-accent rounded-t-sm"
                  style={{ height: `${percentage}%` }}
                />
              </div>
              <span className="font-mono text-micro text-text-quaternary mt-2 tabular-nums">
                {point.date}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * 扩展 tailwind-merge 以识别自定义 @theme token。
 * 否则 text-small / text-caption 等自定义字体尺寸
 * 会被误判为 text-color 与 text-white 冲突。
 */
const twMergeExtended = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-page-title",
        "text-card-title",
        "text-body",
        "text-small",
        "text-caption",
        "text-micro",
        "text-data-large",
      ],
    },
  },
});

/** 合并 Tailwind class，解决冲突（后者覆盖前者） */
export function cn(...inputs: ClassValue[]) {
  return twMergeExtended(clsx(inputs));
}

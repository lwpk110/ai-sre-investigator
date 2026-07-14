import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("合并多个 class", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("Tailwind 冲突后者覆盖前者", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("条件 class 过滤 false", () => {
    expect(cn("text-sm", false && "text-lg")).toBe("text-sm");
  });

  it("空输入返回空字符串", () => {
    expect(cn()).toBe("");
  });
});

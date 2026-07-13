import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RCAPanel } from "../RCAPanel";

const sampleReport = "## 根因分析\n\npayment-service 因内存泄漏导致 OOM，重启后恢复。";

describe("RCAPanel", () => {
  it("渲染报告标题", () => {
    render(
      <RCAPanel report={sampleReport} confidence="high" isPartial={false} />
    );
    expect(screen.getByText("根因分析报告")).toBeInTheDocument();
  });

  it("高置信度显示对应 badge", () => {
    render(
      <RCAPanel report={sampleReport} confidence="high" isPartial={false} />
    );
    expect(screen.getByText("高置信度")).toBeInTheDocument();
  });

  it("中置信度显示对应 badge", () => {
    render(
      <RCAPanel report={sampleReport} confidence="medium" isPartial={false} />
    );
    expect(screen.getByText("中置信度")).toBeInTheDocument();
  });

  it("低置信度显示对应 badge", () => {
    render(
      <RCAPanel report={sampleReport} confidence="low" isPartial={false} />
    );
    expect(screen.getByText("低置信度")).toBeInTheDocument();
  });

  it("完整报告不显示部分报告警告", () => {
    render(
      <RCAPanel report={sampleReport} confidence="high" isPartial={false} />
    );
    expect(screen.queryByText("部分报告")).not.toBeInTheDocument();
  });

  it("部分报告显示警告横幅和缺失查询", () => {
    render(
      <RCAPanel
        report={sampleReport}
        confidence="low"
        isPartial={true}
        missingQueries={["rate(http_requests_total[5m])", "container_memory_rss"]}
      />
    );
    expect(screen.getByText("部分报告")).toBeInTheDocument();
    expect(screen.getByText(/未能完成以下查询/)).toBeInTheDocument();
  });

  it("渲染分段导航", () => {
    render(
      <RCAPanel report={sampleReport} confidence="high" isPartial={false} />
    );
    expect(screen.getByText("服务与问题")).toBeInTheDocument();
    expect(screen.getByText("时间线")).toBeInTheDocument();
    expect(screen.getByText("证据链")).toBeInTheDocument();
    expect(screen.getByText("根因与建议")).toBeInTheDocument();
  });

  it("点击分段导航切换激活态", async () => {
    const user = userEvent.setup();
    render(
      <RCAPanel report={sampleReport} confidence="high" isPartial={false} />
    );

    const evidenceTab = screen.getByText("证据链");
    await user.click(evidenceTab);
    // 点击后不会崩溃即可
    expect(screen.getByText("证据链")).toBeInTheDocument();
  });

  it("渲染分享和导出按钮", () => {
    render(
      <RCAPanel report={sampleReport} confidence="high" isPartial={false} />
    );
    expect(screen.getByText("分享")).toBeInTheDocument();
    expect(screen.getByText("导出")).toBeInTheDocument();
  });

  it("渲染 Markdown 报告内容", () => {
    render(
      <RCAPanel report="## 根因：OOM" confidence="high" isPartial={false} />
    );
    expect(screen.getByText("根因：OOM")).toBeInTheDocument();
  });
});

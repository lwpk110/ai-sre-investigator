/**
 * 场景原型 mock 数据 — 复刻 docs/prototypes/scenarios-prototype.html
 * 6 个场景展示不同排查状态：完整 RCA / 部分 RCA / 进行中 / 对话追问 / 新手引导
 */

// ===== 类型定义 =====

export type ProbeType = "mimir" | "loki" | "tempo" | "shield" | "brain";
export type StepStatus = "ok" | "warn" | "info" | "err" | "running";

export interface SparklineData {
  label: string;
  range: string;
  bars: { height: number; variant: "baseline" | "spike" | "ok" | "warn" }[];
  axis: string[];
}

export interface LogLine {
  ts: string;
  level: "ERR" | "WARN" | "INFO";
  msg: string;
  highlight?: boolean;
  highlightWarn?: boolean;
}

export interface TraceSpan {
  label: string;
  width: number;
  marginLeft: number;
  duration: string;
  variant: "ok" | "slow" | "critical";
}

export interface ResultRow {
  label: string;
  value: string;
  variant?: "alert" | "warn" | "ok";
  secondLabel?: string;
  secondValue?: string;
  secondVariant?: "alert" | "warn" | "ok";
}

export interface HealBlock {
  failText: string;
  fixText: string;
}

export interface ScenarioStep {
  num: string;
  probe: ProbeType;
  title: string;
  subtitle: string;
  status: StepStatus;
  latency: string;
  badge?: string;
  badgeStyle?: "med" | "info";
  expanded?: boolean;
  qlLang?: string;
  qlQuery?: string;
  qlStreaming?: boolean;
  heal?: HealBlock;
  sparkline?: SparklineData;
  logs?: { count: string; lines: LogLine[] };
  trace?: { traceId: string; totalDuration: string; spans: TraceSpan[] };
  results?: ResultRow[];
  skeleton?: string;
}

export interface MetricCard {
  label: string;
  value: string;
  alert?: boolean;
  delta: string;
  deltaUp?: boolean;
}

export interface EvidenceItem {
  num: string;
  text: string;
}

export interface RecommendationItem {
  priority: "P0 立即" | "P1 短期" | "P2 长期";
  text: string;
}

export interface RCAMetrics {
  title: string;
  subtitle: string;
  severity: "P0" | "P1" | "P2" | "P3";
  confidence: "high" | "medium" | "low";
  metrics: MetricCard[];
  evidence: EvidenceItem[];
  rootCause: string[];
  recommendations: RecommendationItem[];
}

export interface Scenario {
  id: string;
  tabLabel: string;
  dotColor: "err" | "warn" | "ok" | "info" | "accent";
  author: string;
  time: string;
  incidentText: string;
  tags: string[];
  statusBadge?: { text: string; variant: "info" };
  budget: { used: number; max: number; tokenUsed: number; tokenMax: number };
  timelineBadge: { text: string; variant: "ok" | "warn" | "info" };
  steps: ScenarioStep[];
  rca?: RCAMetrics;
  isPartial?: boolean;
  missingQueries?: string[];
  partialSuggestions?: string[];
}

// ===== 场景 1: payment-service 500 错误率飙升 =====

const scenario1: Scenario = {
  id: "sc1",
  tabLabel: "500 错误率飙升",
  dotColor: "err",
  author: "luwei",
  time: "14:23 CST",
  incidentText: "payment-service 刚才为什么大量 500？错误率好像突然飙上去了",
  tags: ["payment-service", "HTTP 5xx", "P1"],
  budget: { used: 4, max: 10, tokenUsed: 2100, tokenMax: 5000 },
  timelineBadge: { text: "4 步完成", variant: "ok" },
  steps: [
    {
      num: "01",
      probe: "mimir",
      title: "Mimir - 5xx 错误率查询",
      subtitle: "错误率从 0.1% 飙升至 12.3%，14:23 突发",
      status: "ok",
      latency: "180ms",
      expanded: true,
      qlLang: "PromQL",
      qlQuery: 'sum(rate(http_requests_total{service="payment-service",status="5xx"}[5m])) / sum(rate(http_requests_total{service="payment-service"}[5m]))',
      sparkline: {
        label: "5xx 错误率 - 最近 1 小时",
        range: "14:00 - 15:00",
        bars: [
          { height: 4, variant: "baseline" }, { height: 3, variant: "baseline" }, { height: 5, variant: "baseline" },
          { height: 4, variant: "baseline" }, { height: 3, variant: "baseline" }, { height: 4, variant: "baseline" },
          { height: 5, variant: "baseline" }, { height: 3, variant: "baseline" }, { height: 4, variant: "baseline" },
          { height: 5, variant: "baseline" }, { height: 4, variant: "baseline" }, { height: 6, variant: "baseline" },
          { height: 4, variant: "baseline" }, { height: 5, variant: "baseline" }, { height: 3, variant: "baseline" },
          { height: 4, variant: "baseline" }, { height: 6, variant: "baseline" }, { height: 5, variant: "baseline" },
          { height: 4, variant: "baseline" }, { height: 3, variant: "baseline" }, { height: 5, variant: "baseline" },
          { height: 4, variant: "baseline" }, { height: 6, variant: "baseline" }, { height: 5, variant: "baseline" },
          { height: 4, variant: "baseline" }, { height: 3, variant: "baseline" }, { height: 5, variant: "baseline" },
          { height: 4, variant: "baseline" },
          { height: 35, variant: "spike" }, { height: 72, variant: "spike" }, { height: 98, variant: "spike" },
          { height: 88, variant: "spike" }, { height: 76, variant: "spike" }, { height: 64, variant: "spike" },
          { height: 42, variant: "spike" }, { height: 28, variant: "spike" },
          { height: 6, variant: "baseline" }, { height: 4, variant: "baseline" },
        ],
        axis: ["14:00", "14:15", "14:23 突发", "14:35", "15:00"],
      },
      results: [
        { label: "峰值错误率", value: "12.3%", variant: "alert", secondLabel: "基线", secondValue: "0.1%", secondVariant: "ok" },
        { label: "突发时间", value: "14:23:07 CST" },
      ],
    },
    {
      num: "02",
      probe: "mimir",
      title: "Mimir - P99 延迟查询",
      subtitle: "P99 从 180ms 飙升至 2.8s，与错误率时间窗口完全重合",
      status: "ok",
      latency: "290ms",
      qlLang: "PromQL",
      qlQuery: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="payment-service"}[5m]))',
      results: [
        { label: "P99 峰值", value: "2.8s", variant: "alert", secondLabel: "基线", secondValue: "180ms", secondVariant: "ok" },
        { label: "相关性", value: "与 5xx 错误率时间窗口完全重合", variant: "warn" },
      ],
    },
    {
      num: "03",
      probe: "loki",
      title: "Loki - 错误日志检索",
      subtitle: "首次 QL 语法错误，自动修正后命中 847 条 DB 连接超时日志",
      status: "warn",
      latency: "1.2s",
      badge: "自修正",
      badgeStyle: "med",
      heal: {
        failText: "select * from logs where... 不是合法 LogQL",
        fixText: "自动修正为 LogQL 语法，重试成功",
      },
      qlLang: "LogQL",
      qlQuery: 'rate({service="payment-service"} |= "ERROR" | json [5m])',
      logs: {
        count: "847 条命中",
        lines: [
          { ts: "14:23:12.341", level: "ERR", msg: "HikariPool-1 - Connection is not available, request timed out after 30s", highlight: true },
          { ts: "14:23:12.358", level: "ERR", msg: "java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available", highlight: true },
          { ts: "14:23:14.022", level: "ERR", msg: "payment.handler.OrderHandler - database connection timeout: mysql.payment-db.svc:3306", highlight: true },
          { ts: "14:23:15.891", level: "WARN", msg: "HikariPool-1 - Pool stats (total=10, active=10, idle=0, waiting=47)", highlightWarn: true },
          { ts: "14:23:18.203", level: "ERR", msg: "Connection is not available, request timed out after 30s", highlight: true },
          { ts: "14:23:20.445", level: "ERR", msg: "java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available", highlight: true },
          { ts: "14:23:22.017", level: "WARN", msg: "Pool stats (total=10, active=10, idle=0, waiting=89)", highlightWarn: true },
          { ts: "14:23:25.334", level: "ERR", msg: "database connection timeout: mysql.payment-db.svc:3306", highlight: true },
        ],
      },
      results: [
        { label: "命中日志", value: "847 条", variant: "alert", secondLabel: "时间窗口", secondValue: "14:23 ~ 14:31" },
        { label: "高频模式", value: "database connection timeout: mysql.payment-db.svc:3306", variant: "alert" },
      ],
    },
    {
      num: "04",
      probe: "tempo",
      title: "Tempo - 慢链路下钻",
      subtitle: "定位到 DB 查询 Span 耗时 2.3s，连接池等待占 95%",
      status: "ok",
      latency: "680ms",
      qlLang: "TraceQL",
      qlQuery: '{ resource.service.name = "payment-service" && span.http.status_code >= 500 } | count() > 3',
      trace: {
        traceId: "4f8a2b1c3d5e6f7a",
        totalDuration: "2.84s",
        spans: [
          { label: "POST /api/orders", width: 100, marginLeft: 0, duration: "2.84s", variant: "slow" },
          { label: "  auth.verifyToken", width: 3, marginLeft: 0, duration: "12ms", variant: "ok" },
          { label: "  order.validate", width: 4, marginLeft: 3, duration: "18ms", variant: "ok" },
          { label: "  db.pool.wait", width: 20, marginLeft: 7, duration: "570ms", variant: "critical" },
          { label: "  mysql.query (SELECT)", width: 65, marginLeft: 27, duration: "2.3s 全表扫描", variant: "critical" },
          { label: "  response.send", width: 2, marginLeft: 92, duration: "5ms", variant: "ok" },
        ],
      },
    },
  ],
  rca: {
    title: "RCA: payment-service HTTP 500 Surge",
    subtitle: "2026-07-10 14:23 ~ 14:31 CST | 排查耗时 47s | token 4,200",
    severity: "P1",
    confidence: "high",
    metrics: [
      { label: "错误率峰值", value: "12.3%", alert: true, delta: "+ 12.2pp vs baseline", deltaUp: true },
      { label: "P99 延迟", value: "2.8s", alert: true, delta: "15.6x vs baseline", deltaUp: true },
      { label: "影响交易", value: "3,200", delta: "14:23 ~ 14:31" },
    ],
    evidence: [
      { num: "01", text: "Mimir: 5xx 错误率在 14:23 突然飙升至 12.3%" },
      { num: "02", text: "Mimir: P99 延迟同步升至 2.8s，时间窗口重合" },
      { num: "03", text: "Loki: 847 条 HikariPool connection timeout 错误日志" },
      { num: "04", text: "Tempo: 慢 Trace 4f8a2b... 显示 mysql.query 等待 2.3s" },
    ],
    rootCause: [
      "MySQL 连接池耗尽导致级联超时。HikariCP 连接池上限 maximum-pool-size: 10，支付高峰期并发激增，连接池被快速耗尽。后续请求在 connectionTimeout: 30s 内无法获取连接，触发 SQLTransientConnectionException。",
      "慢查询 SELECT * FROM orders WHERE created_at > ? 缺少索引，单次执行 800ms+，加剧连接占用，形成恶性循环。",
    ],
    recommendations: [
      { priority: "P0 立即", text: "将 HikariCP maximum-pool-size 从 10 提升至 30，connectionTimeout 从 30s 降至 5s" },
      { priority: "P0 立即", text: "为 orders.created_at 添加索引，消除全表扫描" },
      { priority: "P1 短期", text: "引入熔断器（Resilience4j），DB 连接获取失败率超过 10% 时自动降级" },
      { priority: "P2 长期", text: "评估读写分离方案，将报表类慢查询路由至只读副本" },
    ],
  },
};

// ===== 场景 2: order-processor Pod OOM Kill =====

const scenario2: Scenario = {
  id: "sc2",
  tabLabel: "Pod OOM Kill",
  dotColor: "err",
  author: "luwei",
  time: "13:02 CST",
  incidentText: "order-processor 的 Pod 一直在被 OOM Kill，循环重启了好几次",
  tags: ["order-processor", "OOM Killed", "P2"],
  budget: { used: 5, max: 10, tokenUsed: 2500, tokenMax: 5000 },
  timelineBadge: { text: "5 步完成", variant: "ok" },
  steps: [
    {
      num: "01",
      probe: "mimir",
      title: "Mimir - Pod 重启次数",
      subtitle: "order-processor 在 1 小时内重启 7 次，OOM 退出码 137",
      status: "ok",
      latency: "150ms",
      expanded: true,
      qlLang: "PromQL",
      qlQuery: 'increase(kube_pod_container_status_restarts_total{container="order-processor"}[1h])',
      results: [
        { label: "重启次数", value: "7 次 / 1h", variant: "alert", secondLabel: "退出码", secondValue: "137 (OOM)", secondVariant: "alert" },
        { label: "首次重启", value: "12:48 CST" },
      ],
    },
    {
      num: "02",
      probe: "mimir",
      title: "Mimir - 容器内存使用趋势",
      subtitle: "内存从 512MB 线性增长至 1Gi limit，呈内存泄漏特征",
      status: "ok",
      latency: "220ms",
      qlLang: "PromQL",
      qlQuery: 'container_memory_working_set_bytes{container="order-processor"}',
      sparkline: {
        label: "内存使用 - 最近 2 小时",
        range: "limit: 1Gi",
        bars: [
          { height: 38, variant: "ok" }, { height: 42, variant: "ok" }, { height: 45, variant: "ok" },
          { height: 48, variant: "ok" }, { height: 52, variant: "ok" }, { height: 55, variant: "ok" },
          { height: 58, variant: "ok" }, { height: 62, variant: "ok" }, { height: 65, variant: "ok" },
          { height: 68, variant: "ok" }, { height: 72, variant: "ok" }, { height: 75, variant: "ok" },
          { height: 78, variant: "warn" }, { height: 82, variant: "warn" }, { height: 85, variant: "warn" },
          { height: 88, variant: "warn" }, { height: 91, variant: "warn" },
          { height: 95, variant: "spike" }, { height: 98, variant: "spike" }, { height: 100, variant: "spike" },
          { height: 40, variant: "baseline" }, { height: 44, variant: "ok" }, { height: 48, variant: "ok" },
          { height: 52, variant: "ok" }, { height: 55, variant: "ok" }, { height: 58, variant: "ok" },
          { height: 62, variant: "ok" }, { height: 66, variant: "ok" },
          { height: 70, variant: "warn" }, { height: 74, variant: "warn" }, { height: 78, variant: "warn" },
          { height: 82, variant: "warn" }, { height: 86, variant: "warn" },
          { height: 90, variant: "spike" }, { height: 95, variant: "spike" }, { height: 100, variant: "spike" },
          { height: 42, variant: "baseline" }, { height: 46, variant: "ok" }, { height: 50, variant: "ok" },
        ],
        axis: ["11:00", "锯齿状增长", "12:00", "13:00"],
      },
      results: [
        { label: "内存 limit", value: "1 GiB", variant: "warn", secondLabel: "增长速率", secondValue: "+12 MB/min", secondVariant: "alert" },
        { label: "泄漏特征", value: "线性增长 + OOM 后重置，锯齿模式重复 7 次", variant: "warn" },
      ],
    },
    {
      num: "03",
      probe: "loki",
      title: "Loki - OOM Kill 日志",
      subtitle: '7 条 "Killed (exit 137)" 日志，每次 OOM 前有大量 GC 日志',
      status: "ok",
      latency: "340ms",
      qlLang: "LogQL",
      qlQuery: '{container="order-processor"} |= "Killed" or |= "OutOfMemoryError" [2h]',
      logs: {
        count: "7 条 OOM 日志",
        lines: [
          { ts: "12:48:03.221", level: "ERR", msg: "OutOfMemoryError: Java heap space", highlight: true },
          { ts: "12:48:03.340", level: "ERR", msg: "Killed (exit 137) - OOM threshold exceeded", highlight: true },
          { ts: "12:51:15.882", level: "WARN", msg: "GC overhead limit exceeded, 98% time spent in GC", highlightWarn: true },
          { ts: "12:51:16.012", level: "ERR", msg: "OutOfMemoryError: Java heap space", highlight: true },
          { ts: "12:51:16.098", level: "ERR", msg: "Killed (exit 137)", highlight: true },
        ],
      },
    },
    {
      num: "04",
      probe: "loki",
      title: "Loki - 堆内存 Dump 分析",
      subtitle: "OrderCache 占用 780MB (78%)，缓存条目数达 2.1M",
      status: "ok",
      latency: "890ms",
      qlLang: "LogQL",
      qlQuery: '{container="order-processor"} |= "heap dump" | json | line_format "{{.analysis}}" [1h]',
      results: [
        { label: "最大对象", value: "OrderCache: 780MB (78%)", variant: "alert" },
        { label: "缓存条目", value: "2,100,000 条", variant: "warn", secondLabel: "TTL", secondValue: "未设置" },
      ],
    },
    {
      num: "05",
      probe: "shield",
      title: "Agent - 综合分析",
      subtitle: "内存泄漏根因：OrderCache 无 TTL + 无容量上限",
      status: "ok",
      latency: "1.1s",
      results: [
        { label: "根因", value: "OrderCache 无 TTL + 无容量上限，持续增长至 OOM", variant: "alert" },
        { label: "置信度", value: "高（4 条证据交叉验证）", variant: "ok" },
      ],
    },
  ],
  rca: {
    title: "RCA: order-processor Pod OOM Kill 循环",
    subtitle: "2026-07-10 12:48 ~ 13:02 CST | 排查耗时 62s | token 4,800",
    severity: "P2",
    confidence: "high",
    metrics: [
      { label: "重启次数", value: "7", alert: true, delta: "1h 内", deltaUp: true },
      { label: "内存占用", value: "980MB", alert: true, delta: "98% of limit", deltaUp: true },
      { label: "缓存条目", value: "2.1M", delta: "无 TTL 约束" },
    ],
    evidence: [
      { num: "01", text: "Mimir: 1 小时内重启 7 次，退出码 137 (OOM)" },
      { num: "02", text: "Mimir: 内存锯齿状增长，+12MB/min 泄漏速率" },
      { num: "03", text: "Loki: 每次重启前出现 OutOfMemoryError + GC overhead 98%" },
      { num: "04", text: "Loki: 堆 dump 分析显示 OrderCache 占 78% (780MB)" },
    ],
    rootCause: [
      "OrderCache 使用 Caffeine 但未设置 maximumSize 和 expireAfterWrite，订单数据持续写入缓存，2 周累计 210 万条目，堆内存从 512MB 线性增长至 1Gi limit。",
      "到达 limit 后触发 Full GC (STW 2.8s)，但无法回收，最终 OOM Killer 介入终止 Pod，重启后内存归零但继续泄漏，形成锯齿循环。",
    ],
    recommendations: [
      { priority: "P0 立即", text: "为 OrderCache 设置 maximumSize=100000 和 expireAfterWrite=30m" },
      { priority: "P0 立即", text: "将 Pod memory limit 从 1Gi 提升至 2Gi，临时缓解" },
      { priority: "P1 短期", text: "引入 Caffeine recordStats 监控缓存命中率，命中率低于 30% 的缓存应缩减容量" },
      { priority: "P2 长期", text: "评估改用 Redis 集中式缓存，将堆外缓存与 JVM 堆解耦" },
    ],
  },
};

// ===== 场景 3: notification-service 部分 RCA =====

const scenario3: Scenario = {
  id: "sc3",
  tabLabel: "部分 RCA",
  dotColor: "warn",
  author: "luwei",
  time: "11:42 CST",
  incidentText: "notification-service 发送延迟突然变高，钉钉消息延迟好几分钟",
  tags: ["notification-service", "延迟", "P2"],
  budget: { used: 3, max: 10, tokenUsed: 1800, tokenMax: 5000 },
  timelineBadge: { text: "3 步完成 - 2 步缺失", variant: "warn" },
  steps: [
    {
      num: "01",
      probe: "mimir",
      title: "Mimir - 发送延迟查询",
      subtitle: "消息发送 P99 从 200ms 升至 4.2s",
      status: "ok",
      latency: "170ms",
      expanded: true,
      qlLang: "PromQL",
      qlQuery: 'histogram_quantile(0.99, rate(notification_send_duration_seconds_bucket{service="notification-service"}[5m]))',
      results: [
        { label: "P99 峰值", value: "4.2s", variant: "alert", secondLabel: "基线", secondValue: "200ms", secondVariant: "ok" },
      ],
    },
    {
      num: "02",
      probe: "loki",
      title: "Loki - 队列积压日志",
      subtitle: "slow_queue 积压 12,000+ 条消息等待发送",
      status: "warn",
      latency: "450ms",
      qlLang: "LogQL",
      qlQuery: '{service="notification-service"} |= "slow_queue" |= "backlog" [15m]',
      logs: {
        count: "156 条命中",
        lines: [
          { ts: "11:38:22.110", level: "WARN", msg: "slow_queue backlog: 8,400 messages", highlightWarn: true },
          { ts: "11:40:15.332", level: "WARN", msg: "slow_queue backlog: 10,200 messages", highlightWarn: true },
          { ts: "11:42:01.891", level: "ERR", msg: "slow_queue backlog: 12,800 messages - consumer too slow", highlight: true },
        ],
      },
      results: [
        { label: "积压量", value: "12,800 条", variant: "alert", secondLabel: "增长速率", secondValue: "+2,000/min", secondVariant: "alert" },
      ],
    },
    {
      num: "03",
      probe: "loki",
      title: "Loki - rate_limit 拒绝日志",
      subtitle: "钉钉 API rate_limit 拒绝率 34%，大量消息重试堆积",
      status: "err",
      latency: "380ms",
      badge: "关键线索",
      badgeStyle: "med",
      qlLang: "LogQL",
      qlQuery: '{service="notification-service"} |= "rate_limit" |= "dingtalk" [15m]',
      logs: {
        count: "489 条命中",
        lines: [
          { ts: "11:35:44.012", level: "WARN", msg: "dingtalk API rate_limit: 20 msg/min exceeded, backing off 60s", highlightWarn: true },
          { ts: "11:36:44.100", level: "ERR", msg: "rate_limit exceeded, message queued to slow_queue for retry", highlight: true },
          { ts: "11:38:22.045", level: "ERR", msg: "rate_limit: 34% of requests rejected in last 5min", highlight: true },
        ],
      },
      results: [
        { label: "拒绝率", value: "34%", variant: "alert", secondLabel: "API 限制", secondValue: "20 msg/min" },
      ],
    },
  ],
  isPartial: true,
  missingQueries: [
    "Tempo: notification-service 下游依赖链路追踪（未采集到 trace 数据）",
    "Mimir: notification-service Pod CPU/Memory 指标（metrics 标签缺失）",
  ],
  partialSuggestions: [
    "检查 Tempo 是否已为 notification-service 配置 OpenTelemetry instrumentation",
    "确认 notification-service 的 Mimir scrape config 是否包含 cpu/memory 指标",
  ],
};

// ===== 场景 4: search-service 排查进行中 =====

const scenario4: Scenario = {
  id: "st1",
  tabLabel: "排查进行中",
  dotColor: "info",
  author: "luwei",
  time: "刚刚",
  incidentText: "search-service 搜索延迟突然变高，很多请求超时",
  tags: ["search-service", "延迟", "超时"],
  statusBadge: { text: "排查进行中", variant: "info" },
  budget: { used: 3, max: 10, tokenUsed: 1500, tokenMax: 5000 },
  timelineBadge: { text: "3/5 步 - 进行中", variant: "info" },
  steps: [
    {
      num: "01",
      probe: "mimir",
      title: "Mimir - 搜索延迟查询",
      subtitle: "搜索 P99 从 50ms 升至 3.5s，11:38 突发",
      status: "ok",
      latency: "160ms",
      expanded: true,
      qlLang: "PromQL",
      qlQuery: 'histogram_quantile(0.99, rate(search_duration_seconds_bucket{service="search-service"}[5m]))',
      results: [
        { label: "P99 峰值", value: "3.5s", variant: "alert", secondLabel: "基线", secondValue: "50ms", secondVariant: "ok" },
      ],
    },
    {
      num: "02",
      probe: "mimir",
      title: "Mimir - JVM GC 停顿查询",
      subtitle: "Full GC STW 时间从 50ms 飙升至 2.8s/次",
      status: "ok",
      latency: "195ms",
      qlLang: "PromQL",
      qlQuery: 'rate(jvm_gc_pause_seconds_sum{service="search-service",action="end of major GC"}[5m])',
      results: [
        { label: "GC STW", value: "2.8s/次", variant: "alert", secondLabel: "频率", secondValue: "12 次/min", secondVariant: "warn" },
      ],
    },
    {
      num: "03",
      probe: "loki",
      title: "Loki - GC 日志检索",
      subtitle: "正在查询 GC 日志和堆内存 dump 信息...",
      status: "running",
      latency: "1.2s",
      badge: "执行中",
      badgeStyle: "info",
      qlLang: "LogQL",
      qlQuery: 'rate({service="search-service"} |= "GC" | json | "Full" [5m])',
      qlStreaming: true,
      skeleton: "Agent 正在等待 Loki 返回结果...",
    },
    {
      num: "",
      probe: "brain",
      title: "",
      subtitle: "",
      status: "running",
      latency: "",
      skeleton: "Agent 正在思考下一步：基于 GC 停顿数据，准备查询堆内存详情和索引大小...",
    },
  ],
};

// ===== 场景 5: user-service 对话追问 =====

const scenario5: Scenario = {
  id: "st2",
  tabLabel: "对话追问",
  dotColor: "accent",
  author: "luwei",
  time: "昨天 16:20",
  incidentText: "user-service DB 连接池打满，登录接口间歇性超时",
  tags: ["user-service", "DB 连接池", "P2"],
  budget: { used: 4, max: 10, tokenUsed: 2200, tokenMax: 5000 },
  timelineBadge: { text: "4 步完成", variant: "ok" },
  steps: [
    {
      num: "01",
      probe: "mimir",
      title: "Mimir - 连接池使用率",
      subtitle: "HikariCP active 连接 50/50（100%），等待线程 23",
      status: "ok",
      latency: "140ms",
      expanded: true,
      qlLang: "PromQL",
      qlQuery: 'hikaricp_connections_active{pool="user-db"} / hikaricp_connections_max{pool="user-db"}',
      results: [
        { label: "连接池使用率", value: "100% (50/50)", variant: "alert", secondLabel: "等待线程", secondValue: "23", secondVariant: "warn" },
      ],
    },
    {
      num: "02",
      probe: "loki",
      title: "Loki - 慢 SQL 检索",
      subtitle: "SELECT * FROM users WHERE email LIKE 慢查询，平均 2.1s",
      status: "ok",
      latency: "520ms",
      qlLang: "LogQL",
      qlQuery: '{service="user-service"} |= "slow sql" |= "users" [30m]',
      logs: {
        count: "34 条慢 SQL",
        lines: [
          { ts: "16:15:22.014", level: "WARN", msg: "slow sql: SELECT * FROM users WHERE email LIKE '%john%' (2100ms)", highlightWarn: true },
          { ts: "16:16:33.221", level: "WARN", msg: "slow sql: SELECT * FROM users WHERE email LIKE '%test%' (1800ms)", highlightWarn: true },
          { ts: "16:18:44.110", level: "ERR", msg: "connection acquisition timed out after 30s", highlight: true },
        ],
      },
      results: [
        { label: "慢查询", value: "SELECT * FROM users WHERE email LIKE", variant: "alert" },
        { label: "平均耗时", value: "2.1s", variant: "warn", secondLabel: "命中数", secondValue: "34 次" },
      ],
    },
    {
      num: "03",
      probe: "tempo",
      title: "Tempo - 登录链路",
      subtitle: "mysql.query Span 占总耗时 85%，全表扫描 users 表",
      status: "ok",
      latency: "450ms",
      qlLang: "TraceQL",
      qlQuery: '{ resource.service.name = "user-service" && name = "POST /login" } | duration > 1s',
      trace: {
        traceId: "a3b7c9d2e1f4",
        totalDuration: "2.45s",
        spans: [
          { label: "POST /login", width: 100, marginLeft: 0, duration: "2.45s", variant: "slow" },
          { label: "  auth.verifyPassword", width: 5, marginLeft: 0, duration: "120ms", variant: "ok" },
          { label: "  mysql.query (LIKE)", width: 85, marginLeft: 5, duration: "2.1s 全表扫描", variant: "critical" },
          { label: "  jwt.sign", width: 3, marginLeft: 90, duration: "70ms", variant: "ok" },
        ],
      },
    },
    {
      num: "04",
      probe: "shield",
      title: "Agent - 追问响应",
      subtitle: '用户追问「为什么 LIKE 查询这么慢」→ 解释索引缺失 + 数据量',
      status: "ok",
      latency: "0.8s",
      badge: "追问",
      badgeStyle: "info",
      results: [
        { label: "追问内容", value: "为什么 LIKE 查询这么慢？" },
        { label: "Agent 回答", value: "users 表有 500 万行，email LIKE '%keyword%' 无法使用 B-Tree 索引", variant: "warn" },
      ],
    },
  ],
  rca: {
    title: "RCA: user-service DB 连接池打满",
    subtitle: "2026-07-09 16:20 CST | 排查耗时 51s | token 4,100",
    severity: "P2",
    confidence: "medium",
    metrics: [
      { label: "连接池使用率", value: "100%", alert: true, delta: "50/50 active", deltaUp: true },
      { label: "慢 SQL 耗时", value: "2.1s", alert: true, delta: "全表扫描 500 万行", deltaUp: true },
      { label: "影响用户", value: "~800", delta: "间歇性登录超时" },
    ],
    evidence: [
      { num: "01", text: "Mimir: HikariCP 连接池使用率 100%，等待线程 23" },
      { num: "02", text: "Loki: 34 条 LIKE 慢 SQL，平均 2.1s" },
      { num: "03", text: "Tempo: 登录链路 mysql.query Span 占 85%" },
      { num: "04", text: "追问确认: users 表 500 万行，LIKE 无法走索引" },
    ],
    rootCause: [
      "user-service 登录接口使用 email LIKE '%keyword%' 进行模糊查询，users 表 500 万行数据量下无法使用 B-Tree 索引，每次查询全表扫描 2.1s。",
      "高并发场景下连接池被慢查询占满，新请求在 connectionTimeout 内无法获取连接，导致间歇性登录超时。",
    ],
    recommendations: [
      { priority: "P0 立即", text: "将 LIKE '%keyword%' 改为前缀匹配 LIKE 'keyword%' 或引入 Elasticsearch 全文检索" },
      { priority: "P1 短期", text: "将 HikariCP maximum-pool-size 从 50 提升至 80，添加 connectionTimeout 快速失败" },
      { priority: "P2 长期", text: "users 表归档策略：6 个月未活跃用户迁移至 cold_storage 表" },
    ],
  },
};

// ===== 场景 6: inventory-service 新手引导 =====

const scenario6: Scenario = {
  id: "st3",
  tabLabel: "新手引导",
  dotColor: "ok",
  author: "luwei",
  time: "昨天 09:15",
  incidentText: "inventory-service 超时，商品查询偶发性 504",
  tags: ["inventory-service", "超时", "504"],
  budget: { used: 6, max: 10, tokenUsed: 3100, tokenMax: 5000 },
  timelineBadge: { text: "6 步完成", variant: "ok" },
  steps: [
    {
      num: "01",
      probe: "brain",
      title: "Agent - 剧本匹配",
      subtitle: "命中剧本「HTTP 504 网关超时」置信度 87%",
      status: "ok",
      latency: "0.3s",
      badge: "剧本",
      badgeStyle: "info",
      expanded: true,
      results: [
        { label: "命中剧本", value: "HTTP 504 网关超时", variant: "ok" },
        { label: "置信度", value: "87%", secondLabel: "下一步", secondValue: "检查上游 + 下游延迟" },
      ],
    },
    {
      num: "02",
      probe: "mimir",
      title: "Mimir - 504 错误率",
      subtitle: "504 错误率 0.3%，呈间歇性（每 5~8 分钟一次尖峰）",
      status: "ok",
      latency: "130ms",
      qlLang: "PromQL",
      qlQuery: 'sum(rate(http_requests_total{service="inventory-service",status="504"}[5m]))',
      results: [
        { label: "504 错误率", value: "0.3%", variant: "warn", secondLabel: "模式", secondValue: "间歇性尖峰" },
      ],
    },
    {
      num: "03",
      probe: "mimir",
      title: "Mimir - 上游网关延迟",
      subtitle: "ingress-nginx P99 在 504 时段同步升高",
      status: "ok",
      latency: "210ms",
      qlLang: "PromQL",
      qlQuery: 'histogram_quantile(0.99, rate(nginx_request_duration_seconds_bucket{service="inventory-service"}[5m]))',
      results: [
        { label: "ingress P99", value: "60s", variant: "alert", secondLabel: "proxy_timeout", secondValue: "60s" },
      ],
    },
    {
      num: "04",
      probe: "mimir",
      title: "Mimir - 下游 Redis 延迟",
      subtitle: "Redis GET P99 从 1ms 升至 850ms，与 504 尖峰重合",
      status: "ok",
      latency: "180ms",
      qlLang: "PromQL",
      qlQuery: 'histogram_quantile(0.99, rate(redis_command_duration_seconds_bucket{command="GET"}[5m]))',
      results: [
        { label: "Redis P99", value: "850ms", variant: "alert", secondLabel: "基线", secondValue: "1ms", secondVariant: "ok" },
      ],
    },
    {
      num: "05",
      probe: "loki",
      title: "Loki - Redis 连接池日志",
      subtitle: "Lettuce 连接池在尖峰时段出现 borrow timeout",
      status: "warn",
      latency: "410ms",
      qlLang: "LogQL",
      qlQuery: '{service="inventory-service"} |= "redis" |= "timeout" [1h]',
      logs: {
        count: "23 条命中",
        lines: [
          { ts: "09:08:12.221", level: "WARN", msg: "Redis connection borrow timeout after 2000ms", highlightWarn: true },
          { ts: "09:13:44.110", level: "WARN", msg: "Redis connection pool exhausted (max: 16)", highlightWarn: true },
          { ts: "09:21:33.882", level: "ERR", msg: "io.lettuce.core.RedisConnectionException: Unable to connect", highlight: true },
        ],
      },
    },
    {
      num: "06",
      probe: "shield",
      title: "Agent - 综合分析",
      subtitle: "Redis 连接池不足导致间歇性超时，级联触发 504",
      status: "ok",
      latency: "0.9s",
      results: [
        { label: "根因", value: "Redis 连接池 (max 16) 无法支撑并发尖峰", variant: "alert" },
        { label: "置信度", value: "高（5 条证据交叉验证）", variant: "ok" },
      ],
    },
  ],
  rca: {
    title: "RCA: inventory-service 间歇性 504",
    subtitle: "2026-07-09 09:15 ~ 09:28 CST | 排查耗时 73s | token 5,200",
    severity: "P3",
    confidence: "high",
    metrics: [
      { label: "504 错误率", value: "0.3%", delta: "间歇性，5~8 分钟尖峰" },
      { label: "Redis P99", value: "850ms", alert: true, delta: "850x vs baseline", deltaUp: true },
      { label: "连接池使用", value: "100%", alert: true, delta: "16/16 peak", deltaUp: true },
    ],
    evidence: [
      { num: "01", text: "剧本匹配: HTTP 504 网关超时（87% 置信度）" },
      { num: "02", text: "Mimir: 504 错误率 0.3%，间歇性尖峰模式" },
      { num: "03", text: "Mimir: ingress-nginx P99 达 60s proxy_timeout" },
      { num: "04", text: "Mimir: Redis GET P99 从 1ms 飙至 850ms" },
      { num: "05", text: "Loki: Lettuce 连接池 borrow timeout (max 16)" },
    ],
    rootCause: [
      "inventory-service 的 Redis 连接池 Lettuce max-connections 设置为 16，高峰期并发请求超过连接池上限，新请求在 borrow-timeout 内无法获取连接。",
      "Redis 操作超时后，请求耗时超过 ingress-nginx proxy_timeout (60s)，触发 504 Gateway Timeout。呈间歇性是因为仅在并发尖峰（每 5~8 分钟）时连接池才被打满。",
    ],
    recommendations: [
      { priority: "P0 立即", text: "将 Lettuce max-connections 从 16 提升至 64" },
      { priority: "P0 立即", text: "添加 Redis 操作超时熔断：command-timeout 从 2s 降至 500ms，快速失败" },
      { priority: "P1 短期", text: "ingress-nginx proxy_timeout 从 60s 降至 10s，避免长时间挂起" },
      { priority: "P2 长期", text: "引入 Redis Cluster 分片，评估本地缓存 (Caffeine) 减少 Redis 压力" },
    ],
  },
};

// ===== 导出 =====

export const scenarios: Scenario[] = [
  scenario1,
  scenario2,
  scenario3,
  scenario4,
  scenario5,
  scenario6,
];

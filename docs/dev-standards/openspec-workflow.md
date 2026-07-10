# OpenSpec 规范驱动开发工作流

> 项目已集成 OpenSpec v1.5.0(spec-driven schema)+ Codex 的 10 个 skill。
> 所有非平凡功能变更走 OpenSpec 流程:先写 spec,再写代码。

---

## 为什么用 OpenSpec

传统开发的典型问题:改了代码发现方向不对、回归没人发现、PR 描述和实现脱节。
OpenSpec 把"改什么、为什么改、怎么改、改完没"拆成结构化 artifact,在写代码前就把设计钉死。

``+传统:  想法 → 直接写代码 → 测试 → PR(设计在脑子里)
OpenSpec: 想法 → proposal → spec → design → tasks → TDD 实现 → verify → archive
```

---

## 完整流程

### 第一步:发起变更提案 (propose)

```
/opsx:propose "实现 PromQL 语法校验器 L1"
```

OpenSpec 会创建 change 目录并生成四个 artifact:

| artifact | 内容 | 回答什么问题 |
|----------|------|-------------|
| `proposal.md` | 变更概述:做什么、为什么 | 为什么要改? |
| `specs/` | 规格定义:输入/输出/边界条件 | 改完长什么样? |
| `design.md` | 技术设计:怎么实现、架构选型 | 怎么改? |
| `tasks.md` | 实现任务清单:可勾选的步骤 | 具体改哪些? |

### 第二步:实现 (apply)

```
/opsx:apply
```

逐个实现 tasks.md 里的任务。**每个 task 的实现都遵循 TDD 工作流**(见 [tdd-workflow.md](tdd-workflow.md)):

1. 读 task 描述
2. 写失败测试 (RED)
3. 写实现 (GREEN)
4. 重构 (REFACTOR)
5. 勾选 task: `- [ ]` → `- [x]`

### 第三步:验证 (verify)

```
/opsx:verify
```

验证实现的完整性、正确性、一致性:
- **完整性**:所有 task 都勾选了?spec 覆盖了?
- **正确性**:每个需求都有对应实现和测试?
- **一致性**:实现是否遵循 design.md 的架构决策?

### 第四步:归档 (archive)

```
/opsx:archive
```

变更完成后归档,更新主 spec 库。后续变更可以引用已归档的 spec。

---

## OpenSpec Skill 速查

| 命令 | 用途 |
|------|------|
| `/opsx:propose <描述>` | 一步生成完整提案(proposal + spec + design + tasks) |
| `/opsx:new <name>` | 只创建 change 目录,手动逐个生成 artifact |
| `/opsx:apply [change]` | 开始实现 tasks,配合 TDD |
| `/opsx:continue [change]` | 继续未完成的 change |
| `/opsx:verify [change]` | 验证实现是否匹配 spec |
| `/opsx:archive [change]` | 归档已完成的 change |
| `/opsx:explore <问题>` | 探索代码库,回答问题(只读) |
| `/opsx:ff [change]` | fast-forward:跳过 design 直接生成 tasks |
| `/opsx:sync` | 同步 change 之间的 spec 依赖 |
| `/opsx:onboard` | 引导新成员了解项目 spec |

---

## 什么时候必须走 OpenSpec

**必须**:
- 新功能(如新增一个 tool、实现自修正闭环)
- 架构变更(修改 ToolSpec 契约、调整分层)
- 行为变更(改变 QL 校验逻辑、预算策略)
- 跨模块改动(同时改 tools/ 和 agent/)

**可以跳过**:
- bug 修复(TDD 直接覆盖)
- 文档更新
- 配置调整(`.env`、`pyproject.toml` 依赖版本)
- 纯格式化、重命名

---

## 与 ADR 的关系

| 文档 | 回答 | 粒度 | 生命周期 |
|------|------|------|----------|
| ADR | 为什么选这个架构方向 | 架构级 | 永久(被 supersede 不删除) |
| OpenSpec proposal | 这次要改什么、为什么 | 功能级 | 归档后并入主 spec |
| OpenSpec spec | 改完输入输出长什么样 | 接口级 | 活文档 |
| OpenSpec tasks | 具体改哪几个文件 | 任务级 | 一次性 |

**流程**:ADR 定方向 → OpenSpec 定接口和任务 → TDD 保实现质量。

---

## CLI 操作

```bash
openspec list                  # 列出所有活跃 change
openspec list --specs          # 列出所有 spec
openspec status --change <id>  # 查看 change 进度
openspec validate <name>       # 校验 change 或 spec 格式
openspec view                  # 交互式 dashboard
openspec doctor                # 检查 spec/change 健康度
openspec context               # 打印当前工作上下文
```

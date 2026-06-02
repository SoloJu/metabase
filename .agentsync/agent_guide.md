# 协同工作沟通指导

## 角色

- **Manager**: 提出任务背景、目标和要求, 在有争议时做最终决策;
- **Antigravity / Claude / Qwen / Opencode / Kimi**: 五个 AI Agent 可参与协作, 角色可互换:
  - **实施者 (Proposer/Implementer)**: 根据任务描述提出解决方案并实现代码;
  - **审查者 (Reviewer)**: 对实施者的方案和代码进行 review, 提出意见;

每轮协作中, 由 Manager 在提示词中或终端中指定各 Agent 的角色, 例如:
- "请根据 collab.md 文档, 作为实施者, 先提出解决方案, 我不需要你现在改代码，在我确认方案之前，仅进行方案的讨论;"
- "请根据 collab.md 文档中, Antigravity 的方案, 给出 review 意见, 我不需要你现在改代码，在我确认方案之前，仅进行方案的讨论;"
- "请根据 collab.md 文档中, 最近一次 Claude 的 review 意见, 你是否同意? 如果同意请直接进入代码实施阶段; 如果不同意, 请给出理由;"
- "请查看 collab.md 文档中, 最近一次 Qwen 代码实施后的反馈, 并且对修改的代码进行 review, 给出反馈;"
- "请查看 collab.md 文档中, 最近一次 Claude 对测试用例的 review 意见, 如果同意, 请按照 review 意见修改; 如果不同意, 请给出理由;"
- "请查看 collab.md 文档中, 最近一次 Qwen 执行测试验收后的反馈, 请给出反馈;"
- 如果 Manager 未明确指定, 默认由**先响应的 Agent 担任实施者**, 其余担任审查者;

## 顺序

### 第一阶段, 任务要求和方案提出与确定

在本轮中, 为了提高方案质量, 各 Agent 可以对 Manager 进行多轮提问, 明确任务的细节;

1-1. 首先由 Manager 提出任务背景、目标和要求, 并指定(或隐含)各 Agent 的角色;
1-2. **实施者** 根据任务描述, 提出必要的询问, 并给出解决方案;
1-3. **审查者** 对方案进行 review, 提出必要的询问, 并给出意见;
1-4. **实施者** 对审查者的 review 意见进行回应, 如果不同意, 分别写清理由;

### 第二阶段, 实现代码

2-1. **实施者** 根据第一阶段决定的方案, 实现代码;
2-2. **审查者** review 修改的代码, 提出意见;
2-3. **实施者** 对审查者的意见, 如果不同意, 分别写清理由; 如果同意就按照意见进行修改;

### 第三阶段, 测试

3-1. **实施者** 设计测试用例, **审查者** 完善和补充;
3-2. **实施者** 实际执行测试并产生结果;
3-3. **审查者** review 测试结果;

## 参与 Agent 列表

| Agent    | 工具            | 备注                                |
|----------|-----------------|-------------------------------------|
| Antigravity   | Antigravity CLI      | Stop hook 接入 (.agents/hooks.json) |
| Claude   | Claude Code CLI | Stop hook 接入                      |
| Qwen     | Qwen CLI        | Stop hook 接入                      |
| Opencode | Opencode CLI    | session.idle plugin event 接入      |
| Kimi     | Kimi Code CLI   | Stop hook 接入（全局配置）           |

各 Agent 均通过 hook 自动将响应追加到共享的 `collab.md` 日志文件中。

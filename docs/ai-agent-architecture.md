# 学习智能体架构（DeepSeek + Hermes 思想）

## 决策

当前生产环境采用“内嵌 Hermes 思想”，不直接常驻完整 Hermes Agent。网站保留 PostgreSQL 作为唯一业务数据源，在 Next.js 服务内实现模型提供方、长期记忆、历史检索、工具提案和人工审批。

原因：82 服务器目前为 Ubuntu 22.04、4 vCPU、3.6 GiB 内存、2 GiB Swap、约 9 GiB 可用磁盘；有 Node.js 20 与 PostgreSQL，但没有 Docker，系统 Python 为 3.10。Hermes 官方托管安装使用独立 `~/.hermes`、uv 与 Python 3.11，并会带来单独的会话库、工具运行时和常驻 gateway。对当前单人学习站点，内嵌实现更轻、更容易约束写权限。

## 从 Hermes 采用的设计

1. 核心记忆与历史档案分离：少量高价值用户偏好、目标、事实可进入每次模型上下文；ChatGPT 导入历史按需检索，不把全部历史塞进每次请求。
2. 冻结快照：每次请求开始时组装一次记忆快照，保证本次推理上下文稳定。
3. 去重与容量控制：导入片段按 SHA-256 指纹去重；请求只选择有限数量的相关片段。
4. 工具调用不等于执行：模型提出的新增、编辑、删除先写入 `AgentProposal`，由主人批准。
5. 可审计：AI 请求、记忆导入、设置修改和提案决策写入 `AuditLog`。
6. 提供方解耦：DeepSeek 是当前推理模型；以后可以接入完整 Hermes 或第二个 OpenAI API 智能体，而不改业务数据模型。

## 数据流

```text
网站操作 / 导入文件 / AI 对话
              |
              v
     学习数据 + 相关长期记忆
              |
              v
         DeepSeek 推理
          /         \
      只读回答     工具调用
                       |
                       v
               待批准 AgentProposal
                       |
                 主人批准 / 拒绝
                       |
                       v
                白名单执行器 + 审计
```

## 安全边界

- DeepSeek API Key 使用 `AUTH_SECRET` 派生的 AES-256-GCM 密钥加密后保存，页面和日志不回显明文。
- API 基础地址必须使用 HTTPS，仅 localhost/127.0.0.1 允许 HTTP。
- 模型不能直接获得数据库连接、SSH 或任意 shell。
- 当前白名单自动执行仅包括新增长期记忆与新增公式手册条目；其他提案即使批准，也只记录为已批准，需增加专门执行器后才能运行。
- 不启用 Hermes 的 YOLO 模式。若未来运行完整 Hermes，应使用隔离用户、独立工作目录、manual/smart approval 和最小化工具集。

## ChatGPT 互通边界

- 支持导入 ChatGPT 数据导出 ZIP 中的 `conversations.json`，也支持 JSON、Markdown、TXT。
- ChatGPT 消费者产品中的“已保存记忆”没有在本项目所依据的公开开发者接口中提供直接读写通道，因此不能冒充已经自动同步。
- “智能体之间对话”应通过第二个 OpenAI API Provider 实现，而不是控制用户的 ChatGPT 网页会话。后续可以增加双模型会话编排：DeepSeek 提案，OpenAI 模型复核，主人最终批准。

## 参考

- Hermes Agent: https://github.com/NousResearch/hermes-agent
- Hermes Persistent Memory: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
- Hermes Architecture: https://hermes-agent.nousresearch.com/docs/developer-guide/architecture
- Hermes Security: https://hermes-agent.nousresearch.com/docs/user-guide/security
- DeepSeek API: https://api-docs.deepseek.com/api/create-chat-completion
- DeepSeek Models: https://api-docs.deepseek.com/quick_start/pricing/

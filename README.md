# Mistake Atlas

个人数学错题管理系统，单用户、私有部署、PC 端优先。

当前仓库已从原思政刷题系统切换到 Mistake Atlas 第一阶段产品框架。当前阶段用于确认信息架构、页面结构与视觉方向，界面中的题目和统计均为明确标注的演示数据；真实鉴权、PostgreSQL 数据模型、图片、Markdown 导入和 AI Provider 将在后续阶段接入。

## 当前已搭建

- 首页仪表盘与未来 7 天复习预报
- 错题库、错题详情和新增错题表单
- 今日复习、已做对、已掌握、反复错误
- 教材与章节、知识点、错误类型
- Markdown/ZIP/JSON 导入导出入口
- 周报与学习预报
- AI 上下文预览框架
- 学习规则、账号安全、Provider 和备份设置框架
- 回收站
- 独立登录页视觉框架

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Lucide Icons

## 本地运行

```powershell
cd frontend
npm ci
npm run dev -- -p 3001
```

访问 <http://localhost:3001>。

## 验证

```powershell
cd frontend
npm run lint
npm run build
```

## 下一阶段

1. PostgreSQL + Prisma 数据模型与迁移；
2. 单用户初始化、Argon2id、HttpOnly 安全会话；
3. 教材、章节、知识点、错误类型和错题 CRUD；
4. 重做历史与连续 3 次独立正确掌握规则；
5. 鉴权图片、Markdown 导入预览和完整 JSON 导出。

旧 NestJS 后端暂时保留在 `backend/` 作为历史代码，不再进入新系统线上流量。最终数据层接入后会按迁移计划移除或归档。

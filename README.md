# 政治 / 思政刷题与 AI 解析系统

政治 / 思政刷题与 AI 解析系统是一个面向学生的在线学习辅助平台，主要用于政治、思政类课程的日常复习、期末备考和题目巩固。系统以“刷题 + 背题 + 错题复习 + AI 解析”为核心，帮助学生把分散在 Excel、文档或资料中的题目统一整理到线上平台中，形成可持续使用的数字化题库。

这个项目的主要价值在于提升复习效率。传统复习方式通常依赖纸质资料、Excel 表格或截图资料，查找题目不方便，错题难以整理，答案和解析也不容易集中管理。而该系统可以将题目按照教材或课程进行归类，用户可以根据自己的复习需求选择不同范围进行练习，从而减少重复翻找资料的时间，把更多精力放在理解和记忆上。

系统支持两种典型学习场景：

- 背题场景：用户可以直接查看题目和正确答案，适合考前快速记忆。
- 答题场景：用户先独立作答，再查看答案和结果，适合检测自己的掌握程度。

AI 解析是这个项目的重要扩展能力。对于一些容易混淆、难以理解的政治和思政题目，系统可以为题目生成对应的 AI 解析，包括考察知识点、正确答案原因、错误选项辨析和记忆方法。AI 解析并不是简单地告诉用户答案，而是帮助用户理解题目背后的知识点，从而提高复习质量。

在设计上，AI 解析采用题目级缓存机制。同一道题只需要生成一次 AI 解析，之后用户再次查看时直接从数据库读取已有解析，避免重复调用 AI 接口。这种方式既降低了系统运行成本，也保证了同一道题解析内容的一致性。

该项目不仅适合学生个人复习，也适合作为一个完整的 Web 应用实践项目。它涵盖了用户系统、题库管理、文件导入、刷题逻辑、错题复习、AI 接口调用、权限控制、管理员后台、安全风控和反馈处理等多个模块，能够体现一个从前端到后端、从数据库到部署运维的完整开发流程。

总体来说，这个项目的目标不是单纯做一个题目展示网站，而是构建一个更高效、更智能、更便于管理的政治 / 思政学习工具。它能够帮助学生更系统地整理题目、更有针对性地复习错题，并通过 AI 解析辅助理解知识点，从而提升备考效率和学习体验。

## 核心功能

- 教材与题库管理：按课程和教材组织题目，支持管理员导入题库。
- 刷题与背题：支持全部题库、指定教材、错题本、待背题等练习范围。
- 自动错题本：答题模式中答错的题会自动进入错题本。
- 待背题队列：背题模式中标记为“没记住”的题会进入待背题。
- AI 解析：支持题目级 AI 解析生成、缓存、审核和权限控制。
- 管理后台：支持用户、题库、系统设置、支持者、反馈、日志和风控管理。
- 安全能力：包含邮箱验证、会话管理、接口限流、安全日志和风险标记。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| 后端 | NestJS + Prisma + PostgreSQL |
| 认证 | JWT（bcrypt 加密） |
| AI | DeepSeek API |

## 快速启动

### 前置条件

- Node.js >= 20
- PostgreSQL 已安装并运行
- DeepSeek API Key（用于 AI 解析功能）

### 1. 后端

```bash
cd backend

# 复制环境变量
cp .env.example .env
# 编辑 .env，填入你的数据库连接和 DEEPSEEK_API_KEY

# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 填充种子数据
npx prisma db seed

# 启动开发服务器（端口 3000）
npm run start:dev
```

### 2. 前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（端口 3001，自动代理 API 到 3000）
npm run dev
```

### 3. 访问

- 前端：http://localhost:3001
- 后台：http://localhost:3001/admin

### 种子账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 超级管理员 | admin@example.com | Admin123456 |
| 普通用户 | user@example.com | User123456 |
| 支持者用户 | supporter@example.com | Supporter123456 |

## 项目结构

```
LearnWeb/
├── backend/                 # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma    # 核心数据库 Schema
│   │   └── seed.ts          # 种子数据
│   └── src/
│       ├── auth/            # 注册 / 登录 / JWT
│       ├── users/           # 用户资料
│       ├── books/           # 教材管理
│       ├── practice/        # 刷题引擎
│       ├── ai/              # AI 解析
│       ├── admin/           # 管理后台
│       │   ├── banks/       # 题库导入
│       │   ├── users/       # 用户管理
│       │   ├── settings/    # 系统设置
│       │   ├── supporters/  # 支持者管理
│       │   └── logs/        # 操作日志
│       └── common/          # 守卫 / 过滤器 / 拦截器
├── frontend/                # Next.js 前端
│   └── src/
│       ├── app/             # App Router 页面
│       │   ├── login/       # 登录
│       │   ├── register/    # 注册
│       │   ├── books/       # 教材浏览
│       │   ├── practice/    # 刷题
│       │   ├── wrong/       # 错题本
│       │   ├── review/      # 待背题
│       │   ├── profile/     # 个人中心
│       │   └── admin/       # 管理后台
│       ├── components/      # 组件
│       └── lib/             # API 客户端 / Auth 上下文
└── docs/                    # 设计文档
```

## API 端点

### 认证
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录
- `GET /api/auth/me` — 当前用户

### 教材
- `GET /api/books` — 教材列表
- `GET /api/books/:id` — 教材详情

### 刷题
- `GET /api/practice/questions` — 获取题目
- `POST /api/practice/study-action` — 背题操作
- `POST /api/practice/submit` — 提交答案
- `GET /api/wrong` — 错题列表
- `DELETE /api/wrong/:questionId` — 移除错题
- `GET /api/review` — 待背题列表
- `DELETE /api/review/:questionId` — 移除待背题

### AI 解析
- `POST /api/questions/:questionId/ai-explanation` — 获取/生成解析

### 管理后台（需 Admin 权限）
- `GET /api/admin/dashboard` — 仪表盘
- `GET/POST/DELETE /api/admin/banks` — 题库管理
- `GET/PATCH/DELETE /api/admin/users` — 用户管理
- `GET/PUT /api/admin/settings` — 系统设置
- `GET/POST/DELETE /api/admin/supporters` — 支持者管理
- `GET /api/admin/logs` — 操作日志
- `GET /api/admin/ai-explanations` — AI 解析管理

## 环境变量

### 后端 (.env)

| 变量 | 说明 |
|------|------|
| DATABASE_URL | PostgreSQL 连接串 |
| JWT_SECRET | JWT 签名密钥 |
| JWT_ACCESS_EXPIRES_IN | Access Token 过期时间 |
| JWT_REFRESH_EXPIRES_IN | Refresh Token 过期时间 |
| DEEPSEEK_API_KEY | DeepSeek API Key |
| REDIS_URL | Redis 连接串 |
| APP_URL | 前端访问地址 |
| SMTP_HOST | SMTP 服务器地址，用于发送验证邮件和重置密码邮件 |
| SMTP_PORT | SMTP 端口，默认 465 |
| SMTP_USER | SMTP 登录邮箱 |
| SMTP_PASS | SMTP 授权码或密码 |
| MAIL_FROM | 邮件发件人显示名称和地址 |

### 前端 (.env.local)

| 变量 | 说明 |
|------|------|
| NEXT_PUBLIC_API_URL | 后端 API 地址 |

## 安全注意事项

- 密码使用 bcrypt 加密存储
- JWT 有过期时间
- 所有后台接口有 AdminGuard 保护
- AI 解析接口检查用户权限
- 删除操作需二次确认
- AI 调用不传用户隐私数据

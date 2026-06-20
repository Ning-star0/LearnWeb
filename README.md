# 政治 / 思政刷题系统

面向学生的刷题网站，基础刷题功能永久免费。

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
│   │   ├── schema.prisma    # 13 张表 + 8 个枚举
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
| JWT_EXPIRES_IN | JWT 过期时间 |
| DEEPSEEK_API_KEY | DeepSeek API Key |

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

# 政治 / 思政刷题系统 — 设计文档

**日期**: 2026-06-20  
**状态**: 已确认

---

## 1. 项目定位

面向学生的刷题网站，基础功能永久免费。支持者用户可查看 AI 解析。  
AI 解析绑定题目而非用户，同一道题只生成一次，存入数据库复用。

## 2. 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| 后端 | NestJS + Prisma + PostgreSQL |
| 认证 | JWT（7 天有效期） |
| Excel 解析 | xlsx |
| 文件上传 | multer |
| AI | DeepSeek API |
| 数据库 | PostgreSQL |

## 3. 数据库设计（13 张表）

### User
id, email, username, password(bcrypt), role(USER/ADMIN/SUPER_ADMIN), status(ACTIVE/DISABLED), createdAt, updatedAt

### Course
id, name, createdAt, updatedAt  
默认课程：政治 / 思政

### Book
id, courseId, name, cover, sortOrder, createdAt, updatedAt  
5 本示例教材

### QuestionBank
id, userId?, bookId, name, sourceFile, isPublic, createdAt, updatedAt  
代表一次 Excel 上传记录

### Question
id, bankId, bookId, orderNo, type(SINGLE/MULTIPLE/JUDGE/SHORT), stem, answerRaw, answerJson, explanation, sourceType, sourceNote, copyrightRisk(LOW/MEDIUM/HIGH), isPublished, createdAt, updatedAt

### Option
id, questionId, label(A/B/C/D/E), content, orderNo

### AnswerRecord
id, userId, questionId, mode(STUDY/QUIZ), userAnswer, isCorrect, action, createdAt

### WrongQuestion
id, userId, questionId (unique pair), wrongCount, mastered, createdAt, updatedAt

### ReviewQuestion
id, userId, questionId, reason, createdAt, updatedAt

### QuestionAiExplanation
id, questionId(unique), content, model, status(AUTO_APPROVED/PENDING_REVIEW/APPROVED/HIDDEN/REJECTED/FAILED), reportCount, reviewedBy, reviewedAt, createdAt, updatedAt

### SupporterAccess
id, userId, type(LIFETIME_AI_EXPLANATION), source(MANUAL/CODE/PAYMENT), amount, note, createdAt

### SystemSetting
id, key, value, createdAt, updatedAt

### AdminLog
id, adminId, action, target, detail, createdAt

## 4. 后端模块（本期实现）

### AuthModule
- `POST /api/auth/register` — 注册
- `POST /api/auth/login` — 登录，返回 JWT
- `GET /api/auth/me` — 获取当前用户信息

### UsersModule
- `GET /api/users/me` — 当前用户详情
- `PATCH /api/users/me` — 修改基础资料

### BooksModule
- `GET /api/books` — 教材列表 + 每本题目数量
- `GET /api/books/:id` — 教材详情

### 权限守卫
- **JwtAuthGuard** — 验证 JWT，注入 req.user
- **AdminGuard** — 要求 role = ADMIN | SUPER_ADMIN
- **SuperAdminGuard** — 要求 role = SUPER_ADMIN
- **SupporterGuard** — 检查是否支持者 / 管理员 / 超级管理员

### 权限规则
- 普通用户不能访问 `/api/admin/*`
- ADMIN 和 SUPER_ADMIN 可访问后台
- SUPER_ADMIN 可修改角色，ADMIN 不可修改 SUPER_ADMIN
- 只有 ADMIN / SUPER_ADMIN / 支持者用户可查看 AI 解析

## 5. API 约定

- 前缀 `/api/`
- 成功响应: `{ code: 0, data: ... }`
- 错误响应: `{ code: -1, message: "..." }`
- 分页: `{ code: 0, data: { items: [], total: number, page: number, pageSize: number } }`

## 6. 本期不实现

- 前端页面（下期）
- 题库上传 / Excel 解析（下期）
- 刷题逻辑 / 背题逻辑（下期）
- AI 解析生成（下期）
- 管理后台完整 CRUD（下期）
- 支付集成

## 7. 项目目录结构

```
LearnWeb/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   └── dto/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── books/
│   │   └── prisma/
│   ├── package.json
│   └── tsconfig.json
└── docs/
    └── superpowers/
        └── specs/
```

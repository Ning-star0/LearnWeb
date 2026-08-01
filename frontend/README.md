# Mistake Atlas Web

个人学习系统的 Next.js 16 全栈应用。底层支持多个学科，当前完整启用数学。

## 目录

- `src/app/(workspace)`：受保护的业务页面；
- `src/app/access`：未授权设备阻止与主人登录；
- `src/app/actions`：鉴权、数学业务与设置 Server Actions；
- `src/app/api`：私有附件、导出、AI 和健康检查接口；
- `src/components/mistake-atlas`：应用壳、表单和通用展示组件；
- `src/lib`：Prisma、会话、站点配置和掌握规则；
- `prisma`：通用学科数据模型、迁移和初始化脚本。

## 命令

```powershell
npm ci
npx prisma generate
npm test
npm run lint
npm run build
```

生产所需变量见 `.env.example`。首次初始化数据库后运行：

```powershell
npx prisma migrate deploy
npm run db:seed
```

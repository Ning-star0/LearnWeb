# Mistake Atlas Web

Mistake Atlas 的 Next.js 16 单体应用入口。

当前阶段为可部署的产品框架，使用演示数据确认数学错题系统的信息架构和视觉设计。

```powershell
npm ci
npm run lint
npm run build
npm run dev -- -p 3001
```

核心源码：

- `src/app/(workspace)`：受保护工作区未来所在路由；
- `src/components/mistake-atlas`：应用壳和通用展示组件；
- `src/lib/mistake-atlas-data.ts`：框架阶段演示数据，接入 Prisma 后移除；
- `src/app/login`：单用户登录页框架。

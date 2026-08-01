# Mistake Atlas / 个人学习系统

单用户、私有部署、PC 优先的个人学习档案。系统可扩展到多个学科，当前完整启用数学；408、英语和政治保留通用框架。

线上地址：<https://learn.aurorastar.cn>

## 当前能力

- 主人密码门禁与设备会话；
- 可修改网站名称、图标、品牌色及阻止页文案；
- 数学教材、章节、知识点与错误类型；
- 错题 Markdown/LaTeX、图片、新增、编辑、软删除和恢复；
- 重做记录及“连续独立做对 N 次”掌握规则；
- 到期复习、统计、周报、预报、Markdown 导入和 JSON 导出；
- 可选 OpenAI 兼容 AI 学习分析。

详细状态见 [`docs/mistake-atlas/foundation-status.md`](docs/mistake-atlas/foundation-status.md)。

## 技术栈

- Next.js 16 App Router / React 19 / TypeScript / Tailwind CSS 4
- PostgreSQL / Prisma 6
- Argon2id / JOSE 签名会话
- Nginx / systemd / HTTPS

## 本地开发

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npx prisma migrate deploy
npm run db:seed
npm run dev -- -p 3001
```

## 验证

```powershell
cd frontend
npm test
npm run lint
npm run build
npm audit --omit=dev
```

## 生产环境

- 应用服务：`mistake-atlas.service`
- 环境文件：`/opt/mistake-atlas/shared/app.env`
- 私有数据：`/opt/mistake-atlas/data`
- 发布目录：`/opt/mistake-atlas/releases/<git-commit>`
- 当前版本：`/opt/mistake-atlas/current`
- 自动备份：`mistake-atlas-backup.timer` 每天 03:15（Asia/Shanghai）执行
- 备份目录：`/opt/mistake-atlas/data/backups`，保留最近 7 份日备份、4 份周备份、6 份月备份

手动创建并验证一份备份：

```bash
systemctl start mistake-atlas-backup.service
systemctl status mistake-atlas-backup.service
cat /opt/mistake-atlas/data/backups/last-success.json
```

恢复操作会覆盖数据库，并把恢复前的图片和导入目录保留为 `*.pre-restore-<时间>`；必须在服务器上明确传入 `--confirm`：

```bash
/opt/mistake-atlas/current/deploy/scripts/restore-mistake-atlas.sh \
  /opt/mistake-atlas/data/backups/daily/<备份目录> --confirm
```

如有已挂载的异地存储，可在 `app.env` 设置 `BACKUP_REMOTE_DIR`，每日备份会额外复制一份到该目录。

忘记密码时，在服务器生成一次性临时密码。该命令会注销全部旧会话，并要求下次登录后修改密码：

```bash
cd /opt/mistake-atlas/current/frontend
set -a; source /opt/mistake-atlas/shared/app.env; set +a
npm run admin:reset-password -- baixing --generate
```

环境文件和私有数据不得提交到 Git。旧 NestJS 后端保留在 `backend/` 作为历史代码，不接收线上流量。

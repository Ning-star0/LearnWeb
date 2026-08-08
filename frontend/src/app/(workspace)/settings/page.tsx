import { Bot, DatabaseBackup, KeyRound, Lock, Palette, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { changePasswordAction, logoutAllAction } from '@/app/actions/auth-actions';
import { updateAiSettingsAction } from '@/app/actions/agent-actions';
import { updateBrandingAction, updateLearningSettingsAction } from '@/app/actions/settings-actions';
import { PageHeader, SectionTitle, StatusPill } from '@/components/mistake-atlas/ui';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSiteSettings } from '@/lib/site-settings';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ security?: string; brand?: string; learning?: string; ai?: string }> }) {
  const [query, user, site, learning, ai, subjects, sessions] = await Promise.all([
    searchParams, requireUser(), getSiteSettings(),
    prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} }),
    prisma.aiSettings.upsert({ where: { id: 'ai' }, update: {}, create: {} }),
    prisma.subject.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.session.findMany({ where: { userId: (await requireUser()).id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: 'desc' } }),
  ]);
  const securityMessages: Record<string, { text: string; tone: string }> = {
    'first-login': { text: '这是首次登录。请先修改初始密码，完成后再使用其他功能。', tone: 'amber' },
    'invalid-current': { text: '当前密码不正确。', tone: 'rose' },
    'weak-password': { text: '新密码至少 12 位，并且同时包含字母和数字。', tone: 'rose' },
    'password-mismatch': { text: '两次输入的新密码不一致。', tone: 'rose' },
  };
  const message = query.security ? securityMessages[query.security] : null;
  return <>
    <PageHeader eyebrow="System preferences" title="设置" description="品牌、访问页、数学学习规则、主人密码和会话都在这里管理。修改网站名称与图标后会同时更新浏览器标题、侧边栏和阻止页面。" />
    {message ? <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${message.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>{message.text}</div> : null}
    <div className="space-y-5">
      <form action={updateAiSettingsAction} className="atlas-card overflow-hidden">
        <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50/90 via-white to-violet-50/60 p-6 sm:p-7">
          <SectionTitle title="个人学习智能体 · DeepSeek" description="采用 Hermes 的记忆、会话检索与审批思想；当前以内嵌模式运行，不额外常驻完整 Hermes 进程。" action={query.ai ? <StatusPill tone="green">已保存</StatusPill> : <Bot className="size-5 text-blue-600" />} />
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><StatusPill tone={ai.enabled ? 'green' : 'slate'}>{ai.enabled ? '智能体已启用' : '智能体未启用'}</StatusPill><StatusPill tone="blue">Hermes 内嵌模式</StatusPill><StatusPill tone="amber">所有修改必须批准</StatusPill>{ai.encryptedApiKey ? <StatusPill tone="green">API Key 已加密保存</StatusPill> : null}</div>
        </div>
        <div className="grid gap-5 p-6 sm:p-7 lg:grid-cols-2">
          <label><span className="atlas-label">API 地址</span><input name="baseUrl" required className="atlas-input" defaultValue={ai.baseUrl} /></label>
          <label><span className="atlas-label">模型</span><input name="model" required className="atlas-input" defaultValue={ai.model} /><span className="mt-1.5 block text-[11px] text-slate-400">官方当前提供 deepseek-v4-flash 与 deepseek-v4-pro；Flash 更适合频繁的学习工作流。</span></label>
          <label className="lg:col-span-2"><span className="atlas-label">DeepSeek API Key</span><input name="apiKey" type="password" autoComplete="new-password" className="atlas-input" placeholder={ai.encryptedApiKey ? '已配置；留空保持当前密钥' : '输入 DeepSeek API Key'} /><span className="mt-1.5 block text-[11px] text-slate-400">使用服务器 AUTH_SECRET 派生密钥进行 AES-256-GCM 加密，页面与日志不会回显明文。</span></label>
          <label className="lg:col-span-2"><span className="atlas-label">智能体总指令</span><textarea name="systemPrompt" className="min-h-32 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" defaultValue={ai.systemPrompt} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="enabled" type="checkbox" defaultChecked={ai.enabled} />启用 DeepSeek 智能体</label>
          <div className="flex justify-end"><button className="atlas-button-primary"><Save className="size-4" />保存智能体设置</button></div>
        </div>
      </form>
      <form action={updateBrandingAction} className="atlas-card p-6 sm:p-7">
        <SectionTitle title="网站品牌与进入界面" description="这些内容可以随时修改；图标会用于浏览器标签页、侧边栏和移动设备快捷方式。" action={query.brand ? <StatusPill tone="green">已保存</StatusPill> : <Palette className="size-5 text-slate-400" />} />
        <div className="mt-6 grid gap-5 md:grid-cols-2"><label><span className="atlas-label">网站名称 *</span><input name="siteName" required className="atlas-input" defaultValue={site.siteName} /></label><label><span className="atlas-label">网站副标题 *</span><input name="siteSubtitle" required className="atlas-input" defaultValue={site.siteSubtitle} /></label><label className="md:col-span-2"><span className="atlas-label">网站描述</span><input name="siteDescription" className="atlas-input" defaultValue={site.siteDescription} /></label><label><span className="atlas-label">品牌颜色</span><div className="flex gap-3"><input name="brandColor" className="atlas-input" pattern="#[0-9A-Fa-f]{6}" defaultValue={site.brandColor} /><input type="color" defaultValue={site.brandColor} className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1" aria-label="预览品牌颜色" /></div></label><label><span className="atlas-label">网站图标</span><input name="icon" type="file" accept="image/png,image/jpeg,image/webp,image/x-icon" className="block w-full rounded-lg border border-slate-200 bg-white p-2 text-xs" /><span className="mt-1 block text-[11px] text-slate-400">PNG / JPG / WEBP / ICO，最大 1MB；不上传则保留当前图标。</span></label><label className="md:col-span-2"><span className="atlas-label">阻止页面标题 *</span><input name="accessTitle" required className="atlas-input" defaultValue={site.accessTitle} /></label><label className="md:col-span-2"><span className="atlas-label">阻止页面说明</span><textarea name="accessDescription" className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm" defaultValue={site.accessDescription} /></label><label className="md:col-span-2"><span className="atlas-label">首页问候语</span><input name="homeGreeting" className="atlas-input" defaultValue={site.homeGreeting} /></label></div>
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6"><div className="flex items-center gap-3 text-xs text-slate-400"><Image src="/api/site-icon" alt="当前网站图标" width={40} height={40} unoptimized className="size-10 rounded-xl border border-slate-200 object-cover" />当前图标预览</div><button className="atlas-button-primary"><Save className="size-4" />保存网站外观</button></div>
      </form>

      <div className="grid gap-5 xl:grid-cols-2">
        <form action={updateLearningSettingsAction} className="atlas-card p-6"><SectionTitle title="数学学习规则" description="错题与公式手册使用各自的间隔节奏。" action={query.learning ? <StatusPill tone="green">已保存</StatusPill> : <RotateCcw className="size-5 text-slate-400" />} /><div className="mt-5 space-y-4"><label><span className="atlas-label">连续独立正确次数</span><input name="masteryThreshold" type="number" min="1" max="10" className="atlas-input" defaultValue={learning.masteryThreshold} /></label><label><span className="atlas-label">反复错误阈值</span><input name="repeatedErrorThreshold" type="number" min="2" max="20" className="atlas-input" defaultValue={learning.repeatedErrorThreshold} /></label><label><span className="atlas-label">错题复习间隔（天）</span><input name="reviewIntervals" className="atlas-input" defaultValue={learning.reviewIntervals.join(', ')} /></label><label><span className="atlas-label">公式背诵间隔（天）</span><input name="memoryReviewIntervals" className="atlas-input" defaultValue={learning.memoryReviewIntervals.join(', ')} /><span className="mt-1.5 block text-[11px] text-slate-400">默认 2, 3, 7, 14, 30：今天看过后跳过明天，后天再复习。</span></label><button className="atlas-button-primary w-full"><Save className="size-4" />保存学习规则</button></div></form>
        <div className="atlas-card p-6"><SectionTitle title="学科扩展框架" description="当前仅完整启用数学；其他学科已经具备独立数据空间。" /><div className="mt-5 space-y-3">{subjects.map((subject) => <div key={subject.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div className="size-3 rounded-full" style={{ background: subject.color }} /><div className="flex-1"><div className="text-sm font-semibold text-slate-800">{subject.name}</div><div className="mt-0.5 text-xs text-slate-400">{subject.description}</div></div><StatusPill tone={subject.enabled ? 'green' : 'slate'}>{subject.enabled ? '完整启用' : '框架预留'}</StatusPill></div>)}</div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <form action={changePasswordAction} className="atlas-card p-6"><SectionTitle title="修改主人密码" description="密码使用 Argon2id 保存。修改后所有设备立即退出。" action={<ShieldCheck className="size-5 text-emerald-600" />} /><div className="mt-5 space-y-4"><label><span className="atlas-label">当前密码</span><input name="currentPassword" type="password" autoComplete="current-password" required className="atlas-input" /></label><label><span className="atlas-label">新密码</span><input name="newPassword" type="password" autoComplete="new-password" required minLength={12} className="atlas-input" /></label><label><span className="atlas-label">再次输入新密码</span><input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} className="atlas-input" /></label><button className="atlas-button-primary w-full"><Lock className="size-4" />修改密码并退出所有设备</button></div></form>
        <div className="atlas-card p-6"><SectionTitle title="授权设备与会话" description={`当前共有 ${sessions.length} 个有效会话；每个设备默认保持 7 天。`} action={<KeyRound className="size-5 text-slate-400" />} /><div className="mt-5 space-y-3">{sessions.map((session) => <div key={session.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{session.id === user.sessionId ? '当前设备' : '已授权设备'}</span><span className="text-slate-400">{session.lastSeenAt.toLocaleString('zh-CN')}</span></div><div className="mt-2 truncate text-[11px] text-slate-400">{session.ip} · {session.userAgent}</div></div>)}</div><form action={logoutAllAction} className="mt-5"><button className="atlas-button-secondary w-full">退出全部设备</button></form></div>
      </div>

      <div className="atlas-card p-6"><div className="flex gap-3"><DatabaseBackup className="mt-0.5 size-5 text-slate-500" /><div><h3 className="text-sm font-semibold text-slate-800">数据与备份</h3><p className="mt-1 text-xs leading-5 text-slate-500">数据库、题目图片和导出文件位于服务器私有目录。导出中心可随时下载完整 JSON；生产服务器会保留部署前备份。</p></div></div></div>
    </div>
  </>;
}

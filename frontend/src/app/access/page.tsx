import { CheckCircle2, LockKeyhole, ShieldCheck, Sigma } from 'lucide-react';
import { getSiteSettings } from '@/lib/site-settings';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function AccessPage({ searchParams }: {
  searchParams: Promise<{ next?: string; changed?: string }>;
}) {
  const [{ next = '/', changed }, site] = await Promise.all([searchParams, getSiteSettings()]);
  const username = process.env.ADMIN_USERNAME || 'baixing';

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
      <section className="relative hidden overflow-hidden bg-[#17233d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="paper-grid absolute inset-0 opacity-10" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white text-[#17233d]"><Sigma className="size-6" /></div>
          <div><div className="font-serif text-xl font-semibold">{site.siteName}</div><div className="text-[11px] uppercase tracking-[0.2em] text-blue-200">{site.siteSubtitle}</div></div>
        </div>
        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-blue-100">单用户 · 私有部署 · 设备授权</div>
          <h1 className="font-serif text-5xl font-semibold leading-[1.18] tracking-tight xl:text-6xl">{site.accessTitle}</h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">{site.accessDescription}</p>
        </div>
        <div className="relative grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
          {['不开放注册', '安全会话凭证', '全部业务受保护'].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-blue-300" />{item}</div>)}
        </div>
      </section>

      <section className="flex items-center justify-center bg-[var(--atlas-canvas)] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid size-10 place-items-center rounded-xl bg-[var(--atlas-blue)] text-white"><Sigma className="size-5" /></div><div className="font-serif text-xl font-semibold">{site.siteName}</div></div>
          <div className="atlas-card p-7 sm:p-9">
            <div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><LockKeyhole className="size-5" /></div>
            <h2 className="mt-6 font-serif text-3xl font-semibold text-slate-950">访问已被保护</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">这台设备尚未获得授权。输入主人密码后，本设备将在 7 天内保持登录。</p>
            {changed ? <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">密码已更新，请使用新密码重新登录。</div> : null}
            <LoginForm username={username} nextPath={next} />
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 size-4 shrink-0" />系统不会记录明文密码。连续失败 5 次会暂时阻止该来源继续尝试。</div>
          </div>
          <p className="mt-5 text-center text-xs text-slate-400">仅限系统所有者访问 · 未授权访客无法查看任何学习数据</p>
        </div>
      </section>
    </main>
  );
}

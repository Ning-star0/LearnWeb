import Link from 'next/link';
import { ArrowRight, CheckCircle2, Eye, LockKeyhole, Sigma } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-[#17233d] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute inset-0 opacity-10 paper-grid" />
        <div className="relative flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-white text-[#17233d]"><Sigma className="size-6" /></div><div><div className="font-serif text-xl font-semibold">Mistake Atlas</div><div className="text-[11px] uppercase tracking-[0.2em] text-blue-200">Personal learning archive</div></div></div>
        <div className="relative max-w-xl"><div className="mb-5 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs text-blue-100">数学错题管理 · 私有部署</div><h1 className="font-serif text-5xl font-semibold leading-[1.18] tracking-tight xl:text-6xl">把每一次做错，<br />变成下一次做对。</h1><p className="mt-6 max-w-lg text-base leading-8 text-slate-300">记录错因、重做轨迹与复习节奏。连续三次独立做对后掌握，不靠模糊印象判断进步。</p></div>
        <div className="relative grid gap-3 text-sm text-slate-300 sm:grid-cols-3">{['单用户私有空间', '服务端安全会话', '完整数据可导出'].map((item) => <div key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-blue-300" />{item}</div>)}</div>
      </section>
      <section className="flex items-center justify-center bg-[var(--atlas-canvas)] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid size-10 place-items-center rounded-xl bg-[var(--atlas-blue)] text-white"><Sigma className="size-5" /></div><div className="font-serif text-xl font-semibold">Mistake Atlas</div></div>
          <div className="atlas-card p-7 sm:p-9"><div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><LockKeyhole className="size-5" /></div><h2 className="mt-6 font-serif text-3xl font-semibold text-slate-950">欢迎回来</h2><p className="mt-2 text-sm text-slate-500">登录你的私人数学学习档案</p><div className="mt-7 space-y-5"><label><span className="atlas-label">用户名</span><input className="atlas-input" defaultValue="baixing" /></label><label><span className="atlas-label">密码</span><div className="relative"><input type="password" className="atlas-input pr-10" placeholder="输入密码" /><Eye className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /></div></label></div><Link href="/" className="atlas-button-primary mt-7 h-11 w-full">进入框架预览 <ArrowRight className="size-4" /></Link><div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800"><strong>当前为框架预览。</strong> 登录表单尚未连接真实会话，下一阶段启用后将强制首次修改初始密码。</div></div><p className="mt-5 text-center text-xs text-slate-400">仅限系统所有者访问 · 所有业务数据都将在登录后可见</p>
        </div>
      </section>
    </main>
  );
}

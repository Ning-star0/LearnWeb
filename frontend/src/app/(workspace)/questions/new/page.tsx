import Link from 'next/link';
import { Calendar, ChevronLeft, ImagePlus, Save, Sparkles, Upload } from 'lucide-react';
import { PageHeader, StatusPill } from '@/components/mistake-atlas/ui';

export default function NewQuestionPage() {
  return (
    <>
      <PageHeader eyebrow="New mistake" title="录入新错题" description="记录题目本身，更重要的是写清这一次为什么错。标准答案仍保留在纸质资料中。" action={<Link href="/questions" className="atlas-button-secondary"><ChevronLeft className="size-4" />返回错题库</Link>} />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <form className="atlas-card p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5"><div><h2 className="font-semibold text-slate-900">基本信息</h2><p className="mt-1 text-xs text-slate-400">标有 * 的字段为必填项</p></div><StatusPill tone="blue">自动保存草稿</StatusPill></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label><span className="atlas-label">科目 *</span><select className="atlas-input"><option>数学</option></select></label>
            <label><span className="atlas-label">教材 *</span><select className="atlas-input"><option>张宇 1000 题</option><option>高等数学同济第七版</option></select></label>
            <label className="md:col-span-2"><span className="atlas-label">章节 *</span><select className="atlas-input"><option>第一章 / 函数、极限与连续 / 函数极限</option></select></label>
            <label><span className="atlas-label">题型 *</span><select className="atlas-input"><option>计算题</option><option>选择题</option><option>证明题</option></select></label>
            <label><span className="atlas-label">题号</span><input className="atlas-input" placeholder="例如 1.9" /></label>
            <label><span className="atlas-label">来源页码</span><input className="atlas-input" placeholder="例如 36" /></label>
            <label><span className="atlas-label">初次做错日期 *</span><div className="relative"><input className="atlas-input pr-9" defaultValue="2026-08-01" /><Calendar className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /></div></label>
          </div>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <label><span className="atlas-label">题目标题</span><input className="atlas-input" placeholder="用一句话描述这道题，方便以后搜索" /></label>
            <label className="mt-5 block"><span className="atlas-label">题目正文（Markdown + LaTeX）*</span><textarea className="min-h-48 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-7 outline-none focus:border-[var(--atlas-blue)] focus:ring-2 focus:ring-blue-100" placeholder={'计算：\n\n$$\n\\lim_{x\\to+\\infty}x(a^{1/x}-b^{1/x})\n$$'} /></label>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400"><span>支持公式、列表、引用、表格和代码块；危险 HTML 将被过滤。</span><button type="button" className="font-semibold text-[var(--atlas-blue)]">打开预览</button></div>
          </div>

          <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 md:grid-cols-2">
            <label><span className="atlas-label">我的错因 *</span><textarea className="min-h-32 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[var(--atlas-blue)] focus:ring-2 focus:ring-blue-100" placeholder="我当时为什么会做错？是概念、方法、条件还是计算问题？" /></label>
            <label><span className="atlas-label">复盘总结</span><textarea className="min-h-32 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[var(--atlas-blue)] focus:ring-2 focus:ring-blue-100" placeholder="重做时需要特别注意什么？" /></label>
            <label><span className="atlas-label">主要错误类型 *</span><select className="atlas-input"><option>方法没有想到</option><option>概念理解不清</option><option>条件遗漏</option><option>计算失误</option></select></label>
            <label><span className="atlas-label">知识点</span><input className="atlas-input" placeholder="输入并选择知识点" /></label>
            <label className="md:col-span-2"><span className="atlas-label">一句话提醒</span><input className="atlas-input" placeholder="例如：指数中出现 1/x 时，优先考虑令 t=1/x" /></label>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6"><button type="button" className="atlas-button-secondary"><Save className="size-4" />保存草稿</button><button type="button" className="atlas-button-primary"><Sparkles className="size-4" />保存并安排复习</button></div>
        </form>

        <aside className="space-y-5">
          <div className="atlas-card p-5"><h2 className="font-semibold text-slate-900">原题图片</h2><p className="mt-1 text-xs leading-5 text-slate-400">JPG、PNG 或 WEBP，单张不超过 15MB</p><button className="paper-grid mt-4 flex h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-[var(--atlas-blue)]"><ImagePlus className="mb-3 size-8" /><span className="text-sm font-semibold">拖拽或选择图片</span><span className="mt-1 text-xs">图片将通过鉴权接口访问</span></button></div>
          <div className="atlas-card p-5"><h2 className="font-semibold text-slate-900">从 Markdown 导入</h2><p className="mt-2 text-xs leading-5 text-slate-400">已经让 ChatGPT 按标准模板整理好了？可以直接上传文件并进入预览。</p><Link href="/imports" className="atlas-button-secondary mt-4 w-full"><Upload className="size-4" />打开导入中心</Link></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-800"><strong>录入建议</strong><br />错因尽量写当时真实的思考断点，不要只写“粗心”。系统会用它分析错误类型与薄弱知识点。</div>
        </aside>
      </div>
    </>
  );
}

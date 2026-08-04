import { ImagePlus, Save } from 'lucide-react';

type InitialQuestion = {
  externalId: string | null; occurredAt: Date;
  title: string; bodyMarkdown: string; wrongReason: string; reflection: string | null;
  reminder: string | null; textbookId: string; chapterId: string; materialType: string; questionType: string;
  difficulty: number; priority: number; sourcePage: string | null; sourceQuestionNumber: string | null;
  tags: string[]; nextReviewAt: Date | null;
  knowledgePoints: { knowledgePointId: string }[]; errorTypes: { errorTypeId: string }[];
};

export function QuestionForm({ action, textbooks, chapters, knowledgePoints, errorTypes, initial }: {
  action: (formData: FormData) => void | Promise<void>;
  textbooks: { id: string; name: string }[];
  chapters: { id: string; name: string; textbook: { name: string } }[];
  knowledgePoints: { id: string; name: string; chapter: { name: string } }[];
  errorTypes: { id: string; name: string }[];
  initial?: InitialQuestion;
}) {
  const selectedKnowledge = new Set(initial?.knowledgePoints.map((item) => item.knowledgePointId));
  const selectedErrors = new Set(initial?.errorTypes.map((item) => item.errorTypeId));
  const reviewValue = initial?.nextReviewAt ? new Date(initial.nextReviewAt.getTime() - initial.nextReviewAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const occurredValue = initial?.occurredAt
    ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(initial.occurredAt)
    : new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="atlas-card p-6 sm:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2"><span className="atlas-label">辅助标题 *</span><input name="title" className="atlas-input" required defaultValue={initial?.title} placeholder="例如：泰勒展开确定五阶无穷小参数" /></label>
          <label><span className="atlas-label">外部标识</span><input name="externalId" className="atlas-input" defaultValue={initial?.externalId || ''} placeholder="例如 math-2026-000001" /></label>
          <label><span className="atlas-label">首次做错日期 *</span><input name="occurredAt" type="date" required className="atlas-input" defaultValue={occurredValue} /></label>
          <label><span className="atlas-label">教材 *</span><select name="textbookId" className="atlas-input" required defaultValue={initial?.textbookId}><option value="">选择教材</option>{textbooks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span className="atlas-label">章节 *</span><select name="chapterId" className="atlas-input" required defaultValue={initial?.chapterId}><option value="">选择章节</option>{chapters.map((item) => <option key={item.id} value={item.id}>{item.textbook.name} / {item.name}</option>)}</select></label>
          <label><span className="atlas-label">内容类型 *</span><select name="materialType" className="atlas-input" required defaultValue={initial?.materialType || 'EXERCISE'}><option value="EXERCISE">习题</option><option value="EXAMPLE">例题</option></select></label>
          <label><span className="atlas-label">题型</span><select name="questionType" className="atlas-input" defaultValue={initial?.questionType || 'CALCULATION'}><option value="SINGLE_CHOICE">单选题</option><option value="MULTIPLE_CHOICE">多选题</option><option value="FILL_BLANK">填空题</option><option value="CALCULATION">计算题</option><option value="PROOF">证明题</option><option value="TRUE_FALSE">判断题</option><option value="COMPREHENSIVE">综合题</option><option value="OTHER">其他</option></select></label>
          <label><span className="atlas-label">书本页码</span><input name="sourcePage" className="atlas-input" defaultValue={initial?.sourcePage || ''} placeholder="例如 36" /></label>
          <label><span className="atlas-label">例题 / 习题编号（建议必填）</span><input name="sourceQuestionNumber" className="atlas-input" defaultValue={initial?.sourceQuestionNumber || ''} placeholder="例如 1.9；列表显示为例题 1.9" /></label>
          <label><span className="atlas-label">下次复习时间</span><input name="nextReviewAt" type="datetime-local" className="atlas-input" defaultValue={reviewValue} /></label>
          <label><span className="atlas-label">难度（1-5）</span><input name="difficulty" type="number" min="1" max="5" className="atlas-input" defaultValue={initial?.difficulty || 3} /></label>
          <label><span className="atlas-label">优先级</span><select name="priority" className="atlas-input" defaultValue={initial?.priority || 2}><option value="1">低</option><option value="2">普通</option><option value="3">高</option><option value="4">紧急</option></select></label>
          <label className="md:col-span-2"><span className="atlas-label">题目正文（Markdown / LaTeX）*</span><textarea name="bodyMarkdown" required className="min-h-56 w-full resize-y rounded-xl border border-slate-200 p-4 font-mono text-sm leading-6 outline-none focus:border-[var(--atlas-blue)] focus:ring-2 focus:ring-blue-100" defaultValue={initial?.bodyMarkdown} placeholder={'支持 Markdown；行内公式使用 $...$，块公式使用 $$...$$'} /></label>
          <label className="md:col-span-2"><span className="atlas-label">我的错因 *</span><textarea name="wrongReason" required className="min-h-32 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[var(--atlas-blue)] focus:ring-2 focus:ring-blue-100" defaultValue={initial?.wrongReason} placeholder="记录当时真实的思考断点，不只写“粗心”" /></label>
          <label className="md:col-span-2"><span className="atlas-label">复盘总结</span><textarea name="reflection" className="min-h-28 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[var(--atlas-blue)] focus:ring-2 focus:ring-blue-100" defaultValue={initial?.reflection || ''} /></label>
          <label className="md:col-span-2"><span className="atlas-label">一句话提醒</span><input name="reminder" className="atlas-input" defaultValue={initial?.reminder || ''} placeholder="下次看到这类题时先想到什么" /></label>
          <label className="md:col-span-2"><span className="atlas-label">标签（逗号分隔）</span><input name="tags" className="atlas-input" defaultValue={initial?.tags.join('，')} placeholder="极限，重点，二刷" /></label>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="atlas-card p-5"><h2 className="font-semibold text-slate-900">知识点</h2><p className="mt-1 text-xs leading-5 text-slate-400">可多选，第一个选中项作为主要知识点。</p><div className="atlas-scroll mt-4 max-h-52 space-y-2 overflow-auto">{knowledgePoints.length ? knowledgePoints.map((item) => <label key={item.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2.5 text-xs hover:bg-slate-50"><input type="checkbox" name="knowledgePointIds" value={item.id} defaultChecked={selectedKnowledge.has(item.id)} className="mt-0.5" /><span><strong className="font-medium text-slate-700">{item.name}</strong><span className="mt-0.5 block text-[10px] text-slate-400">{item.chapter.name}</span></span></label>) : <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">请先在“知识点”页面添加分类。</p>}</div></div>
        <div className="atlas-card p-5"><h2 className="font-semibold text-slate-900">错误类型</h2><div className="mt-4 flex flex-wrap gap-2">{errorTypes.map((item) => <label key={item.id} className="cursor-pointer"><input type="checkbox" name="errorTypeIds" value={item.id} defaultChecked={selectedErrors.has(item.id)} className="peer sr-only" /><span className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 peer-checked:border-blue-300 peer-checked:bg-blue-50 peer-checked:text-blue-700">{item.name}</span></label>)}</div></div>
        <div className="atlas-card p-5"><h2 className="font-semibold text-slate-900">原题图片</h2><label className="paper-grid mt-4 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-slate-400 hover:border-blue-400 hover:text-[var(--atlas-blue)]"><ImagePlus className="mb-2 size-7" /><span className="text-sm font-semibold">选择一张或多张 JPG / PNG / WEBP</span><span className="mt-1 text-xs">单张最大 15MB、单次最多 10 张，登录后才能访问</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" /></label></div>
        <button className="atlas-button-primary h-11 w-full"><Save className="size-4" />{initial ? '保存修改' : '保存错题并安排复习'}</button>
      </aside>
    </form>
  );
}

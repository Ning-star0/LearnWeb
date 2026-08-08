import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ImportCenter } from '@/components/mistake-atlas/import-center';
import { ImportTypeNav } from '@/components/mistake-atlas/import-type-nav';
import { PageHeader } from '@/components/mistake-atlas/ui';

export default async function QuestionImportPage({ searchParams }: { searchParams: Promise<{ completed?: string }> }) {
  const { completed } = await searchParams;
  return <>
    <PageHeader eyebrow="Mathematics · Question import" title="批量导入错题" description="复制一份总提示词，把题目与出处交给 AI 整理；不需要提供答案，预览无误后再写入错题库。" action={<Link href="/questions" className="atlas-button-secondary"><ArrowLeft className="size-4" />返回错题库</Link>} />
    <ImportTypeNav active="questions" />
    {completed ? <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">批量导入已经完成，题目已写入错题库。</div> : null}
    <ImportCenter />
  </>;
}

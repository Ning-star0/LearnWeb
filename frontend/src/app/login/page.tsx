import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LoginForm } from '@/app/access/login-form';

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; changed?: string }>;
}) {
  const { next = '/', changed } = await searchParams;

  return (
    <main className="relative grid min-h-screen place-items-center bg-[#f7f7f5] px-6 py-12">
      <Link href="/access" aria-label="返回封面" className="absolute left-5 top-5 grid size-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:border-black/20 hover:text-black sm:left-8 sm:top-8">
        <ArrowLeft className="size-4" />
      </Link>
      <section className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-7 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-950">登录</h1>
        {changed ? <div className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">密码已更新，请重新登录。</div> : null}
        <LoginForm nextPath={next} />
      </section>
    </main>
  );
}

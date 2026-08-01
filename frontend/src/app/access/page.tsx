import Link from 'next/link';
import { LogIn, Menu } from 'lucide-react';

export default function AccessPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7f7f5] px-6 text-[#171717]">
      <details className="group absolute right-5 top-5 sm:right-8 sm:top-8">
        <summary
          aria-label="打开菜单"
          className="grid size-9 cursor-pointer list-none place-items-center rounded-full border border-black/10 bg-white/80 text-black/65 shadow-sm backdrop-blur transition hover:border-black/20 hover:text-black [&::-webkit-details-marker]:hidden"
        >
          <Menu className="size-4" />
        </summary>
        <div className="absolute right-0 mt-2 w-28 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg shadow-black/5">
          <Link href="/login" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-black/70 transition hover:bg-black/[0.04] hover:text-black">
            <LogIn className="size-3.5" />
            Login
          </Link>
        </div>
      </details>

      <h1 className="max-w-3xl text-center text-2xl font-medium tracking-[-0.035em] sm:text-4xl">
        Current content is being improved
      </h1>
    </main>
  );
}

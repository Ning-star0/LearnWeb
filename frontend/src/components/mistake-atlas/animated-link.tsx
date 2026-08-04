'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent, type ReactNode } from 'react';

export function AnimatedLink({ href, children, className, exit = 'left' }: {
  href: string;
  children: ReactNode;
  className?: string;
  exit?: 'left' | 'right';
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    const page = document.querySelector<HTMLElement>('[data-page-transition]');
    if (page) page.classList.add(exit === 'left' ? 'atlas-page-exit-left' : 'atlas-page-exit-right');
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    window.setTimeout(() => router.push(href), delay);
  }

  return <Link href={href} onClick={navigate} aria-disabled={leaving} className={className}>{children}</Link>;
}

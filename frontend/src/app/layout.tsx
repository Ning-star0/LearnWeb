import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: { default: site.siteName, template: `%s · ${site.siteName}` },
    description: site.siteDescription,
    icons: { icon: '/api/site-icon', shortcut: '/api/site-icon', apple: '/api/site-icon' },
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

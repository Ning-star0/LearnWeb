import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Mistake Atlas · 数学错题管理',
    template: '%s · Mistake Atlas',
  },
  description: '记录错因、管理重做、看见知识薄弱处。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

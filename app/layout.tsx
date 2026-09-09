import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '热点观察哨·热频日报',
  description: '多来源热点采集 × OpenRouter AI 识别的复古报刊风热点监控站',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

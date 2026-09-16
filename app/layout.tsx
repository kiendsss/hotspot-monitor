import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '热点观察哨·热频日报',
  description: '全程 Vibe Coding 开发的多源热点聚合 × OpenRouter AI 识别的复古报刊风监控站',
  applicationName: '热点观察哨·热频日报',
  // app/icon.svg 由 App Router 自动注入 favicon；这里补 apple-touch 与主题色，手机上不落默认 Next 图标
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4efe4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      {/* 强制 zh-CN 与显式 charset，杜绝浏览器回退到 windows-1252 导致的乱码 */}
      <body>{children}</body>
    </html>
  );
}

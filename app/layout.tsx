import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WAIC 2026 · 展会浏览档案",
  description: "2026 WAIC 参展商、展馆、行业分类与现场影像在线浏览档案。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "WAIC 2026 · 展会浏览档案",
  description: "2026 WAIC 参展商、展馆、行业分类与现场影像在线浏览档案。",
};

export default function Home() {
  redirect("/archive/index.html");
}

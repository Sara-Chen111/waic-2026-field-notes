import type { Metadata } from "next";
import { OverviewPage } from "@/components/overview-page";

export const metadata: Metadata = {
  title: "2026 WAIC 展会总览",
  description: "浏览和筛选 WAIC 2026 参展商与现场影像。",
};

export default function Page() {
  return <OverviewPage />;
}

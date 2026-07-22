import type { Metadata } from "next";
import { InsightsPage } from "@/components/insights-page";

export const metadata: Metadata = {
  title: "Sara 参展心得分享",
  description: "WAIC 2026 现场观察与精选展商。",
};

export default function Page() {
  return <InsightsPage />;
}

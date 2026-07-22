import type { Metadata } from "next";
import { ExhibitorFinderPage } from "@/components/agent-page";

export const metadata: Metadata = {
  title: "展商速查",
  description: "按业务方向标签快速筛选 WAIC 2026 展商。",
};

export default function Page() {
  return <ExhibitorFinderPage />;
}

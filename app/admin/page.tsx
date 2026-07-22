import type { Metadata } from "next";
import { AdminPage } from "@/components/admin-page";

export const metadata: Metadata = {
  title: "管理者后台",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminPage />;
}

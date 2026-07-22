import { listOverrides } from "@/lib/server-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ overrides: await listOverrides() });
}

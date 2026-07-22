import {
  isAuthorized,
  listFeedback,
  listOverrides,
  saveOverride,
  setFeedbackStatus,
} from "@/lib/server-store";
import type { ExhibitorOverride } from "@/lib/waic";

function unauthorized() {
  return Response.json({ error: "管理口令不正确。" }, { status: 401 });
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const [feedback, overrides] = await Promise.all([listFeedback(), listOverrides()]);
  return Response.json({ feedback, overrides });
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const payload = (await request.json()) as
    | { action: "saveOverride"; override: ExhibitorOverride }
    | { action: "feedbackStatus"; id: string; status: "open" | "resolved" };

  if (payload.action === "saveOverride" && payload.override?.exhibitorId) {
    return Response.json({ override: await saveOverride(payload.override) });
  }
  if (
    payload.action === "feedbackStatus" &&
    payload.id &&
    ["open", "resolved"].includes(payload.status)
  ) {
    return Response.json({ feedback: await setFeedbackStatus(payload.id, payload.status) });
  }
  return Response.json({ error: "不支持的操作。" }, { status: 400 });
}

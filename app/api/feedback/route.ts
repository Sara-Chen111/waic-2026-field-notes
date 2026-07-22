import { createFeedback } from "@/lib/server-store";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    exhibitorId?: string;
    exhibitorName?: string;
    message?: string;
  };
  const exhibitorId = payload.exhibitorId?.trim() || "";
  const exhibitorName = payload.exhibitorName?.trim() || "";
  const message = payload.message?.trim() || "";

  if (!exhibitorId || !exhibitorName || !message) {
    return Response.json({ error: "请填写问题描述。" }, { status: 400 });
  }
  if (message.length > 1000) {
    return Response.json({ error: "问题描述不能超过 1000 字。" }, { status: 400 });
  }

  const feedback = await createFeedback({ exhibitorId, exhibitorName, message });
  return Response.json({ feedback }, { status: 201 });
}

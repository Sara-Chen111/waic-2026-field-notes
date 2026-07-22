import { isAuthorized, saveMedia } from "@/lib/server-store";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "管理口令不正确。" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return Response.json({ error: "请选择 JPG、PNG、WebP 或 HEIC 图片。" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: "单张图片不能超过 10 MB。" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const key = `uploads/${crypto.randomUUID()}.${extension}`;
  await saveMedia(key, file);
  return Response.json({ url: `/api/media/${key}` }, { status: 201 });
}

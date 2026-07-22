import { readMedia } from "@/lib/server-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key } = await context.params;
  const media = await readMedia(key.join("/"));
  if (!media) return new Response("Not found", { status: 404 });
  return new Response(media.body, {
    headers: {
      "content-type": media.type,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

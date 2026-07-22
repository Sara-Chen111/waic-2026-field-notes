import { env } from "cloudflare:workers";
import type { ExhibitorOverride, FeedbackRecord } from "./waic";

interface Bindings {
  DB?: D1Database;
  MEDIA?: R2Bucket;
  WAIC_ADMIN_TOKEN?: string;
}

interface PreviewStore {
  overrides: Map<string, ExhibitorOverride>;
  feedback: FeedbackRecord[];
  media: Map<string, { body: ArrayBuffer; type: string }>;
}

const globalStore = globalThis as typeof globalThis & {
  __waicPreviewStore?: PreviewStore;
};

const previewStore =
  globalStore.__waicPreviewStore ??
  (globalStore.__waicPreviewStore = {
    overrides: new Map(),
    feedback: [],
    media: new Map(),
  });

export function bindings() {
  return env as unknown as Bindings;
}

export function isAuthorized(request: Request) {
  const expected = bindings().WAIC_ADMIN_TOKEN || process.env.WAIC_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected && process.env.NODE_ENV !== "production") return supplied === "preview";
  return Boolean(expected && supplied === expected);
}

async function ensureTables(db: D1Database) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS exhibitor_overrides (
      exhibitor_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      exhibitor_id TEXT NOT NULL,
      exhibitor_name TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    )`),
  ]);
}

export async function listOverrides() {
  const db = bindings().DB;
  if (!db) return [...previewStore.overrides.values()];
  await ensureTables(db);
  const result = await db
    .prepare("SELECT payload FROM exhibitor_overrides ORDER BY updated_at DESC")
    .all<{ payload: string }>();
  return result.results.map((row) => JSON.parse(row.payload) as ExhibitorOverride);
}

export async function saveOverride(override: ExhibitorOverride) {
  const value = { ...override, updatedAt: new Date().toISOString() };
  const db = bindings().DB;
  if (!db) {
    previewStore.overrides.set(value.exhibitorId, value);
    return value;
  }
  await ensureTables(db);
  await db
    .prepare(
      `INSERT INTO exhibitor_overrides (exhibitor_id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(exhibitor_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    )
    .bind(value.exhibitorId, JSON.stringify(value), value.updatedAt)
    .run();
  return value;
}

export async function createFeedback(input: {
  exhibitorId: string;
  exhibitorName: string;
  message: string;
}) {
  const record: FeedbackRecord = {
    id: crypto.randomUUID(),
    ...input,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  const db = bindings().DB;
  if (!db) {
    previewStore.feedback.unshift(record);
    return record;
  }
  await ensureTables(db);
  await db
    .prepare(
      `INSERT INTO feedback (id, exhibitor_id, exhibitor_name, message, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      record.id,
      record.exhibitorId,
      record.exhibitorName,
      record.message,
      record.status,
      record.createdAt,
    )
    .run();
  return record;
}

export async function listFeedback() {
  const db = bindings().DB;
  if (!db) return previewStore.feedback;
  await ensureTables(db);
  const result = await db
    .prepare(
      `SELECT id, exhibitor_id AS exhibitorId, exhibitor_name AS exhibitorName,
       message, status, created_at AS createdAt FROM feedback ORDER BY created_at DESC`,
    )
    .all<FeedbackRecord>();
  return result.results;
}

export async function setFeedbackStatus(id: string, status: "open" | "resolved") {
  const db = bindings().DB;
  if (!db) {
    const item = previewStore.feedback.find((record) => record.id === id);
    if (item) item.status = status;
    return item ?? null;
  }
  await ensureTables(db);
  await db.prepare("UPDATE feedback SET status = ? WHERE id = ?").bind(status, id).run();
  return { id, status };
}

export async function saveMedia(key: string, file: File) {
  const bucket = bindings().MEDIA;
  if (bucket) {
    await bucket.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  } else {
    previewStore.media.set(key, { body: await file.arrayBuffer(), type: file.type });
  }
}

export async function readMedia(key: string) {
  const bucket = bindings().MEDIA;
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) return null;
    return { body: object.body, type: object.httpMetadata?.contentType || "image/jpeg" };
  }
  return previewStore.media.get(key) ?? null;
}

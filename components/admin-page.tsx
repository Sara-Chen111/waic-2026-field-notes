"use client";

import {
  ArrowRightLeft,
  Check,
  CircleAlert,
  ImagePlus,
  LogIn,
  MessageSquareText,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useWaicData } from "./use-waic-data";
import {
  normalizeKey,
  resolvePhotoUrl,
  splitCompanyName,
  type Exhibitor,
  type ExhibitorOverride,
  type FeedbackRecord,
} from "@/lib/waic";

type EditableFields = Omit<Exhibitor, "id" | "sequence">;

const textFields: Array<{ key: keyof EditableFields; label: string; multiline?: boolean }> = [
  { key: "company", label: "公司名称" },
  { key: "venue", label: "展馆" },
  { key: "booth", label: "展位" },
  { key: "industry", label: "行业分类" },
  { key: "subfield", label: "细分领域" },
  { key: "business", label: "业务与产品", multiline: true },
  { key: "investors", label: "投资与股东", multiline: true },
  { key: "financing", label: "融资情况", multiline: true },
  { key: "location", label: "所在地" },
  { key: "notes", label: "备注", multiline: true },
];

export function AdminPage() {
  const { exhibitors, overrides, photosFor, reload } = useWaicData();
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [tab, setTab] = useState<"content" | "feedback">("content");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<EditableFields | null>(null);
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [movingPhoto, setMovingPhoto] = useState("");
  const [moveTarget, setMoveTarget] = useState("");

  const overrideMap = useMemo(
    () => new Map(overrides.map((item) => [item.exhibitorId, item])),
    [overrides],
  );
  const selected = exhibitors.find((item) => item.id === selectedId) ?? null;
  const searchResults = useMemo(() => {
    const needle = normalizeKey(query);
    if (!needle) return exhibitors.slice(0, 80);
    return exhibitors
      .filter((item) => normalizeKey(`${item.company} ${item.booth} ${item.industry}`).includes(needle))
      .slice(0, 80);
  }, [exhibitors, query]);

  useEffect(() => {
    const saved = sessionStorage.getItem("waic-admin-token");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is client-only.
    if (saved) setToken(saved);
  }, []);

  const chooseExhibitor = (item: Exhibitor) => {
    const fields = Object.fromEntries(
      textFields.map(({ key }) => [key, item[key] ?? ""]),
    ) as EditableFields;
    setSelectedId(item.id);
    setDraft(fields);
    setDraftPhotos(photosFor(item));
    setNotice("");
    setMovingPhoto("");
    setMoveTarget("");
  };

  const adminFetch = async (path: string, init: RequestInit = {}) =>
    fetch(path, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${token}` },
      cache: "no-store",
    });

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError("");
    const response = await adminFetch("/api/admin");
    const payload = (await response.json()) as {
      error?: string;
      feedback?: FeedbackRecord[];
    };
    if (!response.ok) {
      setAuthError(payload.error || "无法进入管理后台。");
      return;
    }
    sessionStorage.setItem("waic-admin-token", token);
    setFeedback(payload.feedback ?? []);
    setAuthenticated(true);
  };

  const save = async (override: ExhibitorOverride) => {
    const response = await adminFetch("/api/admin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "saveOverride", override }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "保存失败");
  };

  const saveCurrent = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    setNotice("");
    try {
      await save({ exhibitorId: selected.id, fields: draft, photos: draftPhotos });
      await reload();
      setNotice("已保存");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file || !selected) return;
    setSaving(true);
    setNotice("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await adminFetch("/api/admin/upload", { method: "POST", body: form });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "上传失败");
      setDraftPhotos((items) => [...items, payload.url!]);
      setNotice("照片已加入，点击保存后生效");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "上传失败");
    } finally {
      setSaving(false);
    }
  };

  const move = async () => {
    if (!selected || !draft || !movingPhoto || !moveTarget) return;
    const target = exhibitors.find((item) => item.id === moveTarget);
    if (!target) return;
    setSaving(true);
    setNotice("");
    try {
      const targetOverride = overrideMap.get(target.id);
      const targetPhotos = targetOverride?.photos ?? photosFor(target);
      const sourcePhotos = draftPhotos.filter((photo) => photo !== movingPhoto);
      await Promise.all([
        save({ exhibitorId: selected.id, fields: draft, photos: sourcePhotos }),
        save({
          exhibitorId: target.id,
          fields: targetOverride?.fields,
          photos: [...new Set([...targetPhotos, movingPhoto])],
        }),
      ]);
      setDraftPhotos(sourcePhotos);
      setMovingPhoto("");
      setMoveTarget("");
      await reload();
      setNotice(`照片已移动到 ${splitCompanyName(target.company).name}`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "移动失败");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeedback = async (item: FeedbackRecord) => {
    const status = item.status === "open" ? "resolved" : "open";
    const response = await adminFetch("/api/admin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "feedbackStatus", id: item.id, status }),
    });
    if (response.ok) {
      setFeedback((items) => items.map((record) => record.id === item.id ? { ...record, status } : record));
    }
  };

  if (!authenticated) {
    return (
      <main className="admin-login page-shell">
        <form onSubmit={login}>
          <span className="admin-login__icon"><LogIn size={24} /></span>
          <p className="section-label">PRIVATE ACCESS</p>
          <h1>管理者后台</h1>
          <input className="sr-only" name="username" value="waic-admin" autoComplete="username" readOnly />
          <label htmlFor="admin-token">管理口令</label>
          <input id="admin-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" />
          {authError && <p className="form-error"><CircleAlert size={15} /> {authError}</p>}
          <button className="primary-button" type="submit" disabled={!token}>进入后台</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page page-shell">
      <header className="admin-header">
        <div><p className="section-label">CONTENT OPERATIONS</p><h1>管理者后台</h1></div>
        <div className="segmented-control" role="tablist">
          <button className={tab === "content" ? "is-active" : ""} onClick={() => setTab("content")} role="tab">展商内容</button>
          <button className={tab === "feedback" ? "is-active" : ""} onClick={() => setTab("feedback")} role="tab">
            问题反馈 <span>{feedback.filter((item) => item.status === "open").length}</span>
          </button>
        </div>
      </header>

      {tab === "feedback" ? (
        <section className="feedback-list" aria-label="问题反馈">
          {feedback.length === 0 && <p className="empty-admin">暂无问题反馈。</p>}
          {feedback.map((item) => (
            <article key={item.id} className={item.status === "resolved" ? "is-resolved" : ""}>
              <div className="feedback-list__meta">
                <MessageSquareText size={18} />
                <strong>{splitCompanyName(item.exhibitorName).name}</strong>
                <time>{new Date(item.createdAt).toLocaleString("zh-CN")}</time>
              </div>
              <p>{item.message}</p>
              <button className="text-action" type="button" onClick={() => void toggleFeedback(item)}>
                <Check size={15} /> {item.status === "open" ? "标记已处理" : "重新打开"}
              </button>
            </article>
          ))}
        </section>
      ) : (
        <div className="admin-workspace">
          <aside className="admin-directory">
            <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索展商" /></label>
            <div>
              {searchResults.map((item) => (
                <button key={item.id} className={selectedId === item.id ? "is-active" : ""} type="button" onClick={() => chooseExhibitor(item)}>
                  <strong>{splitCompanyName(item.company).name}</strong>
                  <span>{item.venue} · {item.booth || item.industry}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="admin-editor">
            {!selected || !draft ? (
              <div className="admin-placeholder">从左侧选择一家展商。</div>
            ) : (
              <>
                <div className="admin-editor__top">
                  <div><span>{selected.id}</span><h2>{splitCompanyName(selected.company).name}</h2></div>
                  <div><span className="form-notice">{notice}</span><button className="primary-button" onClick={() => void saveCurrent()} disabled={saving}><Save size={16} /> {saving ? "保存中" : "保存修改"}</button></div>
                </div>

                <form className="field-grid" onSubmit={(event) => event.preventDefault()}>
                  {textFields.map((field) => (
                    <label key={field.key} className={field.multiline ? "is-wide" : ""}>
                      <span>{field.label}</span>
                      {field.multiline ? (
                        <textarea rows={4} value={draft[field.key]} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} />
                      ) : (
                        <input value={draft[field.key]} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })} />
                      )}
                    </label>
                  ))}
                </form>

                <section className="photo-admin">
                  <div className="photo-admin__heading">
                    <div><h3>照片归属</h3><span>{draftPhotos.length} 张</span></div>
                    <label className="upload-button">
                      <ImagePlus size={16} /> 上传照片
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => void upload(event.target.files?.[0])} />
                    </label>
                  </div>
                  <div className="photo-admin__grid">
                    {draftPhotos.map((photo) => (
                      <figure key={photo}>
                        <img src={resolvePhotoUrl(photo)} alt="展商现场" />
                        <figcaption>
                          <button type="button" onClick={() => { setMovingPhoto(photo); setMoveTarget(""); }} aria-label="移动照片归属" title="移动照片归属"><ArrowRightLeft size={16} /></button>
                          <button type="button" onClick={() => setDraftPhotos((items) => items.filter((item) => item !== photo))} aria-label="删除照片" title="删除照片"><Trash2 size={16} /></button>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  {movingPhoto && (
                    <div className="move-photo-bar">
                      <ArrowRightLeft size={17} />
                      <select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)} aria-label="选择目标展商">
                        <option value="">移动到...</option>
                        {exhibitors.filter((item) => item.id !== selected.id).map((item) => <option key={item.id} value={item.id}>{splitCompanyName(item.company).name} · {item.booth}</option>)}
                      </select>
                      <button className="secondary-button" type="button" onClick={() => void move()} disabled={!moveTarget || saving}>确认移动</button>
                      <button className="text-action" type="button" onClick={() => setMovingPhoto("")}>取消</button>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

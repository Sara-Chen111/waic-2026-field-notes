"use client";

import { Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { ExhibitorCard } from "./exhibitor-card";
import { ExhibitorDialog } from "./exhibitor-dialog";
import { useWaicData } from "./use-waic-data";
import agentIndex from "@/public/data/agent-index.json";
import {
  exhibitorMatchesIndexedTag,
  prioritizeExhibitorsWithPhotos,
  type Exhibitor,
} from "@/lib/waic";

const pageSize = 48;
const filterTags = [
  "整机方案",
  "大模型",
  "具身智能",
  "医疗健康",
  "智能体",
  "AI芯片",
  "教育",
  "智能终端",
] as const;

const tagsByExhibitorId = new Map(
  agentIndex.map((item) => [item.id, item.tags] as const),
);

export function ExhibitorFinderPage() {
  const {
    exhibitors,
    photosFor,
    photoInfoFor,
    researchFor,
    loading: dataLoading,
    error,
  } = useWaicData();
  const [selectedTag, setSelectedTag] = useState<string>(filterTags[0]);
  const [visible, setVisible] = useState(pageSize);
  const [selected, setSelected] = useState<Exhibitor | null>(null);
  const ordered = useMemo(
    () => prioritizeExhibitorsWithPhotos(exhibitors, (item) => photosFor(item).length > 0),
    [exhibitors, photosFor],
  );
  const filtered = useMemo(
    () => ordered.filter((item) => exhibitorMatchesIndexedTag(item, selectedTag, tagsByExhibitorId)),
    [ordered, selectedTag],
  );

  return (
    <main className="finder-page page-shell">
      <header className="finder-header">
        <div className="finder-mark" aria-hidden="true"><Tags size={30} strokeWidth={1.5} /></div>
        <p className="section-label">WAIC EXHIBITOR FINDER</p>
        <h1>展商速查</h1>
        <p>按业务方向快速筛选 WAIC 2026 展商。</p>
      </header>

      <section className="finder-workspace" aria-label="按方向筛选展商">
        <div className="finder-tags" role="group" aria-label="业务方向">
          {filterTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={selectedTag === tag}
              onClick={() => {
                setSelectedTag(tag);
                setVisible(pageSize);
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        {!dataLoading && !error && (
          <div className="finder-result-count" aria-live="polite">
            <span>{selectedTag}</span>
            <strong>{filtered.length.toLocaleString("zh-CN")} 家</strong>
          </div>
        )}

        {dataLoading && (
          <div className="loading-grid finder-loading" role="status" aria-label="正在读取展商资料">
            {Array.from({ length: 6 }).map((_, index) => <span key={index} />)}
          </div>
        )}
        {error && <p className="error-banner" role="alert">{error}</p>}
        {!dataLoading && !error && filtered.length === 0 && (
          <section className="empty-state">
            <h2>暂无匹配展商</h2>
            <p>请选择其他业务方向。</p>
          </section>
        )}
        {!dataLoading && !error && filtered.length > 0 && (
          <section className="finder-results" aria-label={`${selectedTag}展商`}>
            {filtered.slice(0, visible).map((item) => (
              <ExhibitorCard
                key={item.id}
                exhibitor={item}
                photos={photosFor(item)}
                compact
                onOpen={() => setSelected(item)}
              />
            ))}
          </section>
        )}
        {visible < filtered.length && (
          <div className="load-more">
            <button className="secondary-button" type="button" onClick={() => setVisible((count) => count + pageSize)}>
              查看更多 <span>{Math.min(pageSize, filtered.length - visible)}</span>
            </button>
          </div>
        )}
      </section>

      <ExhibitorDialog
        exhibitor={selected}
        photos={selected ? photosFor(selected) : []}
        photoMatch={selected ? photoInfoFor(selected) : undefined}
        research={selected ? researchFor(selected) : undefined}
        onClose={() => setSelected(null)}
      />
    </main>
  );
}

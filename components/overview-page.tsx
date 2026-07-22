"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ExhibitorCard } from "./exhibitor-card";
import { ExhibitorDialog } from "./exhibitor-dialog";
import { useWaicData } from "./use-waic-data";
import {
  normalizeKey,
  prioritizeExhibitorsWithPhotos,
  type Exhibitor,
} from "@/lib/waic";

const pageSize = 48;

export function OverviewPage() {
  const { exhibitors, photosFor, photoInfoFor, researchFor, loading, error } = useWaicData();
  const [selected, setSelected] = useState<Exhibitor | null>(null);
  const [keyword, setKeyword] = useState("");
  const [venue, setVenue] = useState("");
  const [industry, setIndustry] = useState("");
  const [subfield, setSubfield] = useState("");
  const [visible, setVisible] = useState(pageSize);

  const venues = useMemo(
    () => [...new Set(exhibitors.map((item) => item.venue).filter(Boolean))].sort(),
    [exhibitors],
  );
  const industries = useMemo(
    () => [...new Set(exhibitors.map((item) => item.industry).filter(Boolean))].sort(),
    [exhibitors],
  );
  const subfields = useMemo(
    () => [...new Set(exhibitors.map((item) => item.subfield).filter(Boolean))].sort(),
    [exhibitors],
  );
  const ordered = useMemo(
    () => prioritizeExhibitorsWithPhotos(exhibitors, (item) => photosFor(item).length > 0),
    [exhibitors, photosFor],
  );
  const filtered = useMemo(() => {
    const query = normalizeKey(keyword);
    return ordered.filter((item) => {
      const haystack = normalizeKey(
        [item.company, item.shortName, item.venue, item.booth, item.industry, item.subfield, item.business].join(" "),
      );
      return (
        (!query || haystack.includes(query)) &&
        (!venue || item.venue === venue) &&
        (!industry || item.industry === industry) &&
        (!subfield || item.subfield === subfield)
      );
    });
  }, [industry, keyword, ordered, subfield, venue]);

  const reset = () => {
    setKeyword("");
    setVenue("");
    setIndustry("");
    setSubfield("");
    setVisible(pageSize);
  };
  const active = Boolean(keyword || venue || industry || subfield);
  const hallCount = venues.length;
  const photoCount = exhibitors.reduce((total, item) => total + photosFor(item).length, 0);

  return (
    <>
      <section className="overview-hero" aria-labelledby="overview-title">
        <img src="/archive/assets/photos/3f847a339633c5.jpg" alt="WAIC 2026 宇树科技现场展台" />
        <div className="overview-hero__shade" />
        <div className="overview-hero__content page-shell">
          <p>WORLD ARTIFICIAL INTELLIGENCE CONFERENCE</p>
          <h1 id="overview-title">WAIC 2026</h1>
          <span>一份可搜索、可追溯的展商与现场影像档案。</span>
        </div>
        <dl className="hero-stats page-shell">
          <div><dt>参展商</dt><dd>{exhibitors.length || "—"}</dd></div>
          <div><dt>展馆</dt><dd>{hallCount || "—"}</dd></div>
          <div><dt>现场照片</dt><dd>{photoCount || "—"}</dd></div>
        </dl>
      </section>

      <main className="overview-main page-shell">
        <section className="directory-head" aria-labelledby="directory-title">
          <div>
            <p className="section-label">EXHIBITOR DIRECTORY</p>
            <h2 id="directory-title">查找参展商</h2>
          </div>
          <p>共 {filtered.length.toLocaleString("zh-CN")} 家</p>
        </section>

        <section className="filter-bar" aria-label="筛选参展商">
          <label className="search-control">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={keyword}
              onChange={(event) => { setKeyword(event.target.value); setVisible(pageSize); }}
              placeholder="搜索公司、产品、业务或展位"
              aria-label="关键词搜索"
            />
          </label>
          <span className="filter-icon" aria-hidden="true"><SlidersHorizontal size={18} /></span>
          <select value={venue} onChange={(event) => { setVenue(event.target.value); setVisible(pageSize); }} aria-label="展馆">
            <option value="">全部展馆</option>
            {venues.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={industry} onChange={(event) => { setIndustry(event.target.value); setVisible(pageSize); }} aria-label="行业分类">
            <option value="">全部行业</option>
            {industries.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={subfield} onChange={(event) => { setSubfield(event.target.value); setVisible(pageSize); }} aria-label="细分领域">
            <option value="">全部领域</option>
            {subfields.map((item) => <option key={item}>{item}</option>)}
          </select>
          {active && (
            <button className="clear-button" type="button" onClick={reset} title="清空筛选">
              <X size={16} /> 清空
            </button>
          )}
        </section>

        {loading && (
          <div className="loading-grid" role="status" aria-label="正在读取展商资料">
            {Array.from({ length: 8 }).map((_, index) => <span key={index} />)}
          </div>
        )}
        {error && <p className="error-banner" role="alert">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <section className="empty-state">
            <h3>没有找到匹配展商</h3>
            <p>试试减少筛选条件或换一个关键词。</p>
            <button className="secondary-button" type="button" onClick={reset}>查看全部</button>
          </section>
        )}
        <section className="exhibitor-grid" aria-live="polite">
          {filtered.slice(0, visible).map((item) => (
            <ExhibitorCard key={item.id} exhibitor={item} photos={photosFor(item)} onOpen={() => setSelected(item)} />
          ))}
        </section>
        {visible < filtered.length && (
          <div className="load-more">
            <button className="secondary-button" type="button" onClick={() => setVisible((count) => count + pageSize)}>
              查看更多 <span>{Math.min(pageSize, filtered.length - visible)}</span>
            </button>
          </div>
        )}
      </main>

      <ExhibitorDialog
        exhibitor={selected}
        photos={selected ? photosFor(selected) : []}
        photoMatch={selected ? photoInfoFor(selected) : undefined}
        research={selected ? researchFor(selected) : undefined}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

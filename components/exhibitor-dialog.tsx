"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Globe2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  resolvePhotoUrl,
  splitCompanyName,
  type Exhibitor,
  type PhotoMatch,
  type ResearchRecord,
} from "@/lib/waic";

export function ExhibitorDialog({
  exhibitor,
  photos,
  photoMatch,
  research,
  onClose,
}: {
  exhibitor: Exhibitor | null;
  photos: string[];
  photoMatch?: PhotoMatch;
  research?: ResearchRecord;
  onClose: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset transient modal state for a new record. */
    setPhotoIndex(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [exhibitor?.id]);

  useEffect(() => {
    if (!exhibitor) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (photoIndex !== null) setPhotoIndex(null);
        else onClose();
      }
      if (photoIndex !== null && event.key === "ArrowLeft") {
        setPhotoIndex(Math.max(0, photoIndex - 1));
      }
      if (photoIndex !== null && event.key === "ArrowRight") {
        setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1));
      }
    };
    document.addEventListener("keydown", listener);
    document.body.classList.add("dialog-open");
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.classList.remove("dialog-open");
    };
  }, [exhibitor, onClose, photoIndex, photos.length]);

  if (!exhibitor) return null;
  const company = splitCompanyName(exhibitor.company);
  const displayName = exhibitor.shortName || company.name;
  const hasPublishedPhotoSources = Boolean(photoMatch?.photoSources?.length);
  const galleryLabel = hasPublishedPhotoSources ? "公开报道中的现场照片" : "现场影像";
  const facts = [
    ["展馆", exhibitor.venue],
    ["展位", exhibitor.booth],
    ["行业", exhibitor.industry],
    ["细分", exhibitor.subfield],
    ["所在地", exhibitor.location],
    ["融资", exhibitor.financing],
  ].filter(([, value]) => value);

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="exhibitor-title">
      <button className="modal-backdrop" aria-label="关闭展商详情" onClick={onClose} />
      <section className="detail-panel">
        <div className="detail-panel__top">
          <span>EXHIBITOR PROFILE</span>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭" title="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="detail-panel__heading">
          <p>{exhibitor.venue} {exhibitor.booth && `· ${exhibitor.booth}`}</p>
          <h2 id="exhibitor-title">{displayName}</h2>
          {company.english && <span>{company.english}</span>}
        </div>

        <div className="detail-panel__content">
          <div className="detail-copy-column">
            {research?.profile && (
              <section>
                <h3>公司概览</h3>
                <p>{research.profile}</p>
              </section>
            )}
            <section>
              <h3>业务与产品</h3>
              <p>{research?.productSummary || exhibitor.business || "资料待补充。"}</p>
            </section>
            {exhibitor.notes && (
              <section>
                <h3>现场备注</h3>
                <p>{exhibitor.notes}</p>
              </section>
            )}
          </div>
          <dl className="detail-facts">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            {research?.websiteUrl && (
              <div>
                <dt>官网</dt>
                <dd>
                  <a href={research.websiteUrl} target="_blank" rel="noreferrer">
                    打开官网 <Globe2 size={14} />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {photos.length > 0 && (
          <section className="detail-gallery">
            <h3>{galleryLabel} <span>{photos.length}</span></h3>
            <div>
              {photos.map((photo, index) => (
                <button key={photo} type="button" onClick={() => setPhotoIndex(index)}>
                  <img src={resolvePhotoUrl(photo)} alt={`${displayName} ${galleryLabel} ${index + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}

        {photoMatch?.photoSources && photoMatch.photoSources.length > 0 && (
          <section className="photo-sources">
            <h3>图片来源</h3>
            <ul>
              {photoMatch.photoSources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title} <ExternalLink size={14} />
                  </a>
                  <span>
                    {source.publisher} · {source.sourceType === "xiaohongshu" ? "小红书现场分享" : "官方新闻"}
                    {source.publishedAt ? ` · ${source.publishedAt}` : ` · 访问于 ${source.accessedAt}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {photoMatch?.photoBusinessInfo && photoMatch.photoBusinessInfo.length > 0 && (
          <section className="photo-observations">
            <h3>照片中的业务线索</h3>
            <div>
              {photoMatch.photoBusinessInfo.slice(0, 6).map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  {item.title && <strong>{item.title}</strong>}
                  {item.description && <p>{item.description}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

      </section>

      {photoIndex !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${galleryLabel}预览`}>
          <button className="lightbox__backdrop" aria-label="关闭照片" onClick={() => setPhotoIndex(null)} />
          <button className="icon-button lightbox__close" onClick={() => setPhotoIndex(null)} aria-label="关闭照片">
            <X size={22} />
          </button>
          <button
            className="icon-button lightbox__prev"
            onClick={() => setPhotoIndex(Math.max(0, photoIndex - 1))}
            disabled={photoIndex === 0}
            aria-label="上一张"
          >
            <ChevronLeft size={24} />
          </button>
          <img src={resolvePhotoUrl(photos[photoIndex])} alt={`${displayName} ${galleryLabel} ${photoIndex + 1}`} />
          <button
            className="icon-button lightbox__next"
            onClick={() => setPhotoIndex(Math.min(photos.length - 1, photoIndex + 1))}
            disabled={photoIndex === photos.length - 1}
            aria-label="下一张"
          >
            <ChevronRight size={24} />
          </button>
          <span>{photoIndex + 1} / {photos.length}</span>
        </div>
      )}
    </div>
  );
}

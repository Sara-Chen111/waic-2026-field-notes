import { ArrowUpRight, Images } from "lucide-react";
import {
  resolvePhotoUrl,
  splitCompanyName,
  type Exhibitor,
} from "@/lib/waic";

export function ExhibitorCard({
  exhibitor,
  photos,
  onOpen,
  compact = false,
  coverPhotoIndex = 0,
}: {
  exhibitor: Exhibitor;
  photos: string[];
  onOpen: () => void;
  compact?: boolean;
  coverPhotoIndex?: number;
}) {
  const company = splitCompanyName(exhibitor.company);
  const displayName = exhibitor.shortName || company.name;
  const coverPhoto = photos[coverPhotoIndex];
  const hasPhoto = Boolean(coverPhoto);
  const className = ["exhibitor-card", compact && "is-compact", !hasPhoto && "is-placeholder"]
    .filter(Boolean)
    .join(" ");
  return (
    <article className={className}>
      <button type="button" onClick={onOpen} aria-label={`查看 ${displayName} 详情`}>
        {hasPhoto ? (
          <>
            <span className="exhibitor-card__media">
              <img src={resolvePhotoUrl(coverPhoto)} alt={`${displayName} WAIC 展商图片`} loading="lazy" />
              <span className="photo-count">
                <Images size={14} /> {photos.length}
              </span>
            </span>
            <span className="exhibitor-card__body">
              <span className="card-meta">
                {exhibitor.venue} {exhibitor.booth && `· ${exhibitor.booth}`}
              </span>
              <strong>{displayName}</strong>
              {company.english && <small>{company.english}</small>}
              <span className="card-tags">
                {[exhibitor.industry, exhibitor.subfield].filter(Boolean).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </span>
              <span className="card-open" aria-hidden="true">
                查看档案 <ArrowUpRight size={16} />
              </span>
            </span>
          </>
        ) : (
          <span className="exhibitor-card__placeholder">
            <small className="card-meta">
              {exhibitor.venue} {exhibitor.booth && `· ${exhibitor.booth}`}
            </small>
            <strong>{displayName}</strong>
            <span>{exhibitor.business}</span>
          </span>
        )}
      </button>
    </article>
  );
}

"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExhibitorCard } from "./exhibitor-card";
import { ExhibitorDialog } from "./exhibitor-dialog";
import { useWaicData } from "./use-waic-data";
import { resolvePublicUrl, type Exhibitor } from "@/lib/waic";

interface InsightBlock {
  type: "paragraph" | "list";
  text?: string;
  items?: string[];
}

interface InsightMedia {
  type: "image" | "video";
  src: string;
  alt: string;
  caption: string;
  poster?: string;
  fit?: "cover" | "contain";
  aspect?: "landscape" | "portrait";
}

interface InsightSection {
  kicker?: string;
  heading: string;
  blocks: InsightBlock[];
  links?: Array<{ label: string; url: string }>;
  media?: InsightMedia[];
  featuredExhibitorIds?: string[];
  featuredPhotoIndexes?: Record<string, number>;
}

interface InsightContent {
  eyebrow: string;
  title: string;
  dek: string;
  date: string;
  hero: { src: string; alt: string };
  chapters: Array<{
    title: string;
    intro?: string;
    sections: InsightSection[];
  }>;
}

export function InsightsPage() {
  const router = useRouter();
  const { exhibitors, photosFor, photoInfoFor, researchFor } = useWaicData();
  const [content, setContent] = useState<InsightContent | null>(null);
  const [selected, setSelected] = useState<Exhibitor | null>(null);

  useEffect(() => {
    fetch(resolvePublicUrl("/data/insights.json"))
      .then((response) => response.json() as Promise<InsightContent>)
      .then(setContent)
      .catch(() => setContent(null));
  }, []);

  return (
    <main className="insights-page">
      <header className="article-header page-shell">
        <button className="back-button" type="button" onClick={() => router.push("/overview")}>
          <ArrowLeft size={18} /> 返回
        </button>
        <div>
          <p>{content?.eyebrow || "SARA / FIELD NOTES"}</p>
          <span>{content?.date || "2026.07"}</span>
        </div>
        <h1>{content?.title || "WAIC 2026 参展心得"}</h1>
        <p className="article-dek">{content?.dek}</p>
      </header>

      <div className="article-hero">
        <img
          src={resolvePublicUrl(content?.hero.src || "/archive/assets/photos/796708bc5f2702.jpg")}
          alt={content?.hero.alt || "WAIC 2026 展会现场"}
        />
      </div>

      <article className="article-body page-shell">
        {content?.chapters.map((chapter, chapterIndex) => {
          const chapterId = `insight-chapter-${chapterIndex + 1}`;
          return (
            <section key={chapter.title} className="article-chapter" aria-labelledby={chapterId}>
              <header className="article-chapter__header">
                <p>CHAPTER {String(chapterIndex + 1).padStart(2, "0")}</p>
                <h2 id={chapterId}>{chapter.title}</h2>
                {chapter.intro && <span>{chapter.intro}</span>}
              </header>

              {chapter.sections.map((section, sectionIndex) => {
                const featured = (section.featuredExhibitorIds || [])
                  .map((id) => exhibitors.find((item) => item.id === id))
                  .filter((item): item is Exhibitor => Boolean(item));
                const sectionNumber = `${String(chapterIndex + 1).padStart(2, "0")}.${String(sectionIndex + 1).padStart(2, "0")}`;
                return (
                  <section key={section.heading} className="article-section">
                    <div className="article-section__number">{sectionNumber}</div>
                    <div className="article-section__copy">
                      {section.kicker && <p className="article-section__kicker">{section.kicker}</p>}
                      <h3>{section.heading}</h3>

                      <div className="article-section__prose">
                        {section.blocks.map((block, blockIndex) => {
                          if (block.type === "list") {
                            return (
                              <ul key={`${section.heading}-list-${blockIndex}`}>
                                {(block.items || []).map((item) => <li key={item}>{item}</li>)}
                              </ul>
                            );
                          }
                          return <p key={`${section.heading}-paragraph-${blockIndex}`}>{block.text}</p>;
                        })}
                      </div>

                      {section.links && section.links.length > 0 && (
                        <div className="article-links">
                          {section.links.map((link) => (
                            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                              {link.label} <ExternalLink size={14} />
                            </a>
                          ))}
                        </div>
                      )}

                      {section.media && section.media.length > 0 && (
                        <div className="insight-media-grid">
                          {section.media.map((media) => {
                            const className = [
                              "insight-media",
                              `is-${media.aspect || "landscape"}`,
                              media.fit === "contain" && "is-contain",
                            ].filter(Boolean).join(" ");
                            return (
                              <figure key={media.src} className={className}>
                                <div className="insight-media__frame">
                                  {media.type === "video" ? (
                                    <video
                                      controls
                                      playsInline
                                      preload="metadata"
                                      poster={media.poster ? resolvePublicUrl(media.poster) : undefined}
                                      aria-label={media.alt}
                                    >
                                      <source src={resolvePublicUrl(media.src)} type="video/mp4" />
                                      浏览器不支持视频播放。
                                    </video>
                                  ) : (
                                    <img src={resolvePublicUrl(media.src)} alt={media.alt} loading="lazy" />
                                  )}
                                </div>
                                <figcaption>{media.caption}</figcaption>
                              </figure>
                            );
                          })}
                        </div>
                      )}

                      {featured.length > 0 && (
                        <div className="article-section__cards">
                          {featured.map((exhibitor) => (
                            <ExhibitorCard
                              key={exhibitor.id}
                              exhibitor={exhibitor}
                              photos={photosFor(exhibitor)}
                              coverPhotoIndex={section.featuredPhotoIndexes?.[exhibitor.id]}
                              compact
                              onOpen={() => setSelected(exhibitor)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </section>
          );
        })}
      </article>

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

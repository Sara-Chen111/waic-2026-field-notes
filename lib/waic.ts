export interface Exhibitor {
  id: string;
  sequence: number;
  company: string;
  shortName?: string;
  venue: string;
  booth: string;
  industry: string;
  subfield: string;
  business: string;
  investors: string;
  financing: string;
  location: string;
  notes: string;
  mergedExhibitorIds?: string[];
}

export interface PhotoBusinessInfo {
  title?: string;
  description?: string;
  evidence?: string;
  photo?: string;
}

export interface PhotoSource {
  sourceType: "official_news" | "xiaohongshu";
  title: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  accessedAt: string;
  photos: string[];
}

export interface PhotoMatch {
  company: string;
  photos: string[];
  photoBusinessInfo?: PhotoBusinessInfo[];
  photoSources?: PhotoSource[];
  venues?: string[];
}

export interface ResearchRecord {
  company: string;
  profile?: string;
  productSummary?: string;
  websiteUrl?: string;
  xiaohongshuUrl?: string;
  searchUrl?: string;
  sources?: Array<{ title: string; url: string; description?: string }>;
}

export interface ExhibitorOverride {
  exhibitorId: string;
  fields?: Partial<Omit<Exhibitor, "id" | "sequence">>;
  photos?: string[];
  updatedAt?: string;
}

export interface FeedbackRecord {
  id: string;
  exhibitorId: string;
  exhibitorName: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
}

export const normalizeKey = (value = "") =>
  value
    .toLocaleLowerCase("zh-CN")
    .replace(/[\s·•\-—_（）()【】[\].,，。&]/g, "");

const CROSS_VENUE_CANONICAL_IDS = new Map([
  ["exhibitor-0235", "exhibitor-0235"],
  ["exhibitor-0248", "exhibitor-0235"],
  ["exhibitor-0366", "exhibitor-0366"],
  ["exhibitor-0405", "exhibitor-0366"],
  ["exhibitor-0822", "exhibitor-0822"],
  ["exhibitor-0862", "exhibitor-0822"],
]);

const exhibitorGroupKey = (exhibitor: Exhibitor) => {
  const canonicalId = CROSS_VENUE_CANONICAL_IDS.get(exhibitor.id);
  return canonicalId ? `canonical:${canonicalId}` : `company:${normalizeKey(exhibitor.company)}`;
};

export function splitCompanyName(company: string) {
  const [name, ...english] = company.split(/\s+\/\s+/);
  return { name: name || company, english: english.join(" / ") };
}

export function mergeExhibitor(
  exhibitor: Exhibitor,
  override?: ExhibitorOverride,
) {
  return override?.fields ? { ...exhibitor, ...override.fields } : exhibitor;
}

export function consolidateExhibitors(exhibitors: Exhibitor[]) {
  const groups = new Map<string, Exhibitor[]>();
  for (const exhibitor of exhibitors) {
    const key = exhibitorGroupKey(exhibitor);
    groups.set(key, [...(groups.get(key) ?? []), exhibitor]);
  }

  return exhibitors.flatMap((exhibitor) => {
    const group = groups.get(exhibitorGroupKey(exhibitor)) ?? [exhibitor];
    const expo = group.find((item) => item.venue === "世博展览馆");
    const spansVenues = new Set(group.map((item) => item.venue)).size > 1;
    if (!expo || !spansVenues) return [exhibitor];
    if (exhibitor.id !== expo.id) return [];

    const records = [expo, ...group.filter((item) => item.id !== expo.id)];
    const booths = [...new Set(records.map((item) => item.booth).filter(Boolean))];
    return [{
      ...expo,
      booth: booths.join(" / "),
      mergedExhibitorIds: records.map((item) => item.id),
    }];
  });
}

export function prioritizeExhibitorsWithPhotos<T>(
  exhibitors: T[],
  hasPhotos: (exhibitor: T) => boolean,
) {
  return [...exhibitors].sort(
    (left, right) => Number(hasPhotos(right)) - Number(hasPhotos(left)),
  );
}

export function exhibitorMatchesIndexedTag(
  exhibitor: Pick<Exhibitor, "id" | "mergedExhibitorIds">,
  tag: string,
  tagsByExhibitorId: ReadonlyMap<string, readonly string[]>,
) {
  const ids = exhibitor.mergedExhibitorIds ?? [exhibitor.id];
  return ids.some((id) => tagsByExhibitorId.get(id)?.includes(tag));
}

export function photosForVenue(match: PhotoMatch | undefined, venue: string) {
  if (!match) return [];
  if (match.venues?.length && !match.venues.includes(venue)) return [];
  return match.photos;
}

export function resolvePhotoUrl(photo: string) {
  if (/^(?:https?:|data:|\/)/.test(photo)) return photo;
  return `/archive/${photo}`;
}

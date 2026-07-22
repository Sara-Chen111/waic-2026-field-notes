"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  consolidateExhibitors,
  mergeExhibitor,
  normalizeKey,
  photosForVenue,
  type Exhibitor,
  type ExhibitorOverride,
  type PhotoMatch,
  type ResearchRecord,
} from "@/lib/waic";

interface DataState {
  exhibitors: Exhibitor[];
  photoMatches: PhotoMatch[];
  research: ResearchRecord[];
  overrides: ExhibitorOverride[];
}

export function useWaicData() {
  const [data, setData] = useState<DataState>({
    exhibitors: [],
    photoMatches: [],
    research: [],
    overrides: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [exhibitorsResponse, photosResponse, researchResponse, contentResponse] =
        await Promise.all([
          fetch("/data/exhibitors.json"),
          fetch("/data/photo_matches.json"),
          fetch("/data/exhibitor_research.json"),
          fetch("/api/content", { cache: "no-store" }),
        ]);
      if (!exhibitorsResponse.ok || !photosResponse.ok || !researchResponse.ok) {
        throw new Error("展商资料读取失败。请检查公共数据文件。 ");
      }
      const [exhibitors, photoPayload, researchPayload] = await Promise.all([
        exhibitorsResponse.json() as Promise<Exhibitor[]>,
        photosResponse.json() as Promise<{ matches?: PhotoMatch[] }>,
        researchResponse.json() as Promise<{ records?: ResearchRecord[] }>,
      ]);
      const content = contentResponse.ok
        ? ((await contentResponse.json()) as { overrides?: ExhibitorOverride[] })
        : { overrides: [] };
      setData({
        exhibitors,
        photoMatches: photoPayload.matches ?? [],
        research: researchPayload.records ?? [],
        overrides: content.overrides ?? [],
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "展商资料读取失败。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data load.
    void load();
  }, [load]);

  const overrideMap = useMemo(
    () => new Map(data.overrides.map((item) => [item.exhibitorId, item])),
    [data.overrides],
  );
  const exhibitors = useMemo(
    () => consolidateExhibitors(
      data.exhibitors.map((item) => mergeExhibitor(item, overrideMap.get(item.id))),
    ),
    [data.exhibitors, overrideMap],
  );
  const photoMap = useMemo(
    () => new Map(data.photoMatches.map((item) => [normalizeKey(item.company), item])),
    [data.photoMatches],
  );
  const researchMap = useMemo(
    () => new Map(data.research.map((item) => [normalizeKey(item.company), item])),
    [data.research],
  );

  const photosFor = useCallback(
    (exhibitor: Exhibitor) => {
      const override = overrideMap.get(exhibitor.id);
      if (override?.photos) return override.photos;
      const match = photoMap.get(normalizeKey(exhibitor.company));
      return photosForVenue(match, exhibitor.venue);
    },
    [overrideMap, photoMap],
  );

  return {
    exhibitors,
    overrides: data.overrides,
    photoMatches: data.photoMatches,
    researchFor: (exhibitor: Exhibitor) => researchMap.get(normalizeKey(exhibitor.company)),
    photoInfoFor: (exhibitor: Exhibitor) => photoMap.get(normalizeKey(exhibitor.company)),
    photosFor,
    loading,
    error,
    reload: load,
  };
}

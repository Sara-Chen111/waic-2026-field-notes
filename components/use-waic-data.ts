"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  consolidateExhibitors,
  normalizeKey,
  photosForVenue,
  resolvePublicUrl,
  type Exhibitor,
  type PhotoMatch,
  type ResearchRecord,
} from "@/lib/waic";

interface DataState {
  exhibitors: Exhibitor[];
  photoMatches: PhotoMatch[];
  research: ResearchRecord[];
}

export function useWaicData() {
  const [data, setData] = useState<DataState>({
    exhibitors: [],
    photoMatches: [],
    research: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [exhibitorsResponse, photosResponse, researchResponse] =
        await Promise.all([
          fetch(resolvePublicUrl("/data/exhibitors.json")),
          fetch(resolvePublicUrl("/data/photo_matches.json")),
          fetch(resolvePublicUrl("/data/exhibitor_research.json")),
        ]);
      if (!exhibitorsResponse.ok || !photosResponse.ok || !researchResponse.ok) {
        throw new Error("展商资料读取失败。请检查公共数据文件。 ");
      }
      const [exhibitors, photoPayload, researchPayload] = await Promise.all([
        exhibitorsResponse.json() as Promise<Exhibitor[]>,
        photosResponse.json() as Promise<{ matches?: PhotoMatch[] }>,
        researchResponse.json() as Promise<{ records?: ResearchRecord[] }>,
      ]);
      setData({
        exhibitors,
        photoMatches: photoPayload.matches ?? [],
        research: researchPayload.records ?? [],
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

  const exhibitors = useMemo(
    () => consolidateExhibitors(data.exhibitors),
    [data.exhibitors],
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
      const match = photoMap.get(normalizeKey(exhibitor.company));
      return photosForVenue(match, exhibitor.venue);
    },
    [photoMap],
  );

  return {
    exhibitors,
    photoMatches: data.photoMatches,
    researchFor: (exhibitor: Exhibitor) => researchMap.get(normalizeKey(exhibitor.company)),
    photoInfoFor: (exhibitor: Exhibitor) => photoMap.get(normalizeKey(exhibitor.company)),
    photosFor,
    loading,
    error,
    reload: load,
  };
}

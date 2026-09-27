"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./client-api";
import { runtimeMinutes } from "./duration";
import type { Title, TitleFacts } from "./model";

// One batch supplies genres and missing movie runtimes; original library records stay untouched.
export function useTitleFacts(titles: Title[]) {
  const [facts, setFacts] = useState<Record<string, TitleFacts>>({});
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const cache = useRef<Record<string, TitleFacts>>({});
  const keys = [...new Set(titles.filter(title => !Array.isArray(title.genres) || (title.mediaType === "movie" && runtimeMinutes(title.runtime) === null)).map(title => title.key))].sort().join(",");

  useEffect(() => {
    const controller = new AbortController();
    const missing = keys ? keys.split(",").filter(key => !(key in cache.current)) : [];
    setLoading(missing.length > 0);
    void (async () => {
      for (let index = 0; index < missing.length; index += 8) {
        if (controller.signal.aborted) return;
        try {
          const data = await api<{ items: Record<string, TitleFacts>; errors: string[] }>(`/api/title-facts?keys=${encodeURIComponent(missing.slice(index, index + 8).join(","))}`, { signal: controller.signal });
          if (controller.signal.aborted) return;
          cache.current = { ...cache.current, ...data.items };
          setFacts(cache.current);
        } catch { if (controller.signal.aborted) return; }
      }
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [keys, retry]);

  return { facts, loading, retry: () => { cache.current = {}; setRetry(value => value + 1); } };
}

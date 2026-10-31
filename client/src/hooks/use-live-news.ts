import { useEffect, useState } from "react";
import { queryClient } from "@/lib/queryClient";

/** Subscribes to server-sent events; the server pushes "news" when new stories arrive. */
export function useLiveNews() {
  const [connected, setConnected] = useState(false);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const es = new EventSource("/api/news/stream");
    es.addEventListener("hello", () => setConnected(true));
    es.addEventListener("news", (e) => {
      const { added } = JSON.parse((e as MessageEvent).data);
      setNewCount((n) => n + added);
    });
    es.addEventListener("images", () => {
      void queryClient.invalidateQueries({
        predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/news?"),
      });
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  const showNew = () => {
    setNewCount(0);
    queryClient.invalidateQueries({ queryKey: ["/api/news"], exact: false });
  };
  return { connected, newCount, showNew };
}

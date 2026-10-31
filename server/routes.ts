import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { factCheckRequestSchema, langEnum, type NewsItem } from "@shared/schema";
import { runFactCheck, summarize } from "./factcheck";
import { fetchAllNews, scheduleImageEnrichment, summaryInputFor } from "./news";
import { extractFromUrl } from "./extract";
import { rateLimit } from "./lib/rateLimit";
import { llmConfigured } from "./lib/llm";
import { assertPublicUrl } from "./lib/net";

const REFRESH_MIN = Number(process.env.NEWS_REFRESH_MIN ?? 10);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGE_REDIRECTS = 5;
const clients = new Set<Response>();
let lastUpdated: string | null = null;
let lastError: string | null = null;
let refreshing: Promise<number> | null = null;
let imageBroadcastTimer: NodeJS.Timeout | null = null;

function broadcast(event: string, data: unknown) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((c) => c.write(msg));
}

function broadcastImageUpdates() {
  if (imageBroadcastTimer) return;
  imageBroadcastTimer = setTimeout(() => {
    imageBroadcastTimer = null;
    broadcast("images", {});
  }, 300);
}

async function refreshNews(): Promise<number> {
  if (refreshing) return refreshing; // de-duplicate concurrent refreshes
  refreshing = (async () => {
    try {
      const items = await fetchAllNews();
      if (!items.length) throw new Error("No stories fetched from any feed (network blocked or feeds changed).");
      const added = await storage.mergeNewsItems(items);
      scheduleImageEnrichment(await storage.getNewsItems(), broadcastImageUpdates);
      lastUpdated = new Date().toISOString();
      lastError = null;
      if (added) broadcast("news", { added, updatedAt: lastUpdated });
      console.log(`[news] refreshed: ${items.length} stories, ${added} new`);
      return added;
    } catch (e: any) {
      lastError = e.message;
      console.error("[news] refresh failed:", e.message);
      return 0;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

const errMsg = (e: any, fallback: string) => (e?.message as string) || fallback;

class ImageProxyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function fetchPublicImage(rawUrl: string): Promise<{ body: Buffer; contentType: string }> {
  let url = rawUrl;
  for (let hop = 0; hop <= MAX_IMAGE_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const upstream = await fetch(url, {
      redirect: "manual",
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(12000),
    });
    if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("location")) {
      url = new URL(upstream.headers.get("location")!, url).toString();
      continue;
    }
    if (!upstream.ok) throw new ImageProxyError(502, "Image source unavailable");
    const contentType = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/") || contentType === "image/svg+xml") {
      throw new ImageProxyError(415, "URL did not return a supported image");
    }
    const contentLength = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      throw new ImageProxyError(413, "Image exceeds the 2 MB limit");
    }
    const reader = upstream.body?.getReader();
    if (!reader) throw new ImageProxyError(502, "Image source returned no body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageProxyError(413, "Image exceeds the 2 MB limit");
      }
      chunks.push(value);
    }
    return { body: Buffer.concat(chunks), contentType };
  }
  throw new ImageProxyError(502, "Too many image redirects");
}

export async function registerRoutes(app: Express): Promise<Server> {
  const aiLimit = rateLimit(Number(process.env.AI_RATE_LIMIT ?? 20), 3600_000);

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, ai: llmConfigured(), factCheckDb: !!process.env.GOOGLE_FACTCHECK_API_KEY, lastUpdated, lastError }),
  );

  app.get("/api/img", async (req, res) => {
    const url = typeof req.query.u === "string" ? req.query.u : "";
    if (!url || url.length > 2048) return res.status(400).json({ message: "A valid image URL is required" });
    try {
      const image = await fetchPublicImage(url);
      res.set({
        "Content-Type": image.contentType,
        "Content-Length": String(image.body.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      }).send(image.body);
    } catch (error: any) {
      const status = error instanceof ImageProxyError ? error.status : 400;
      res.status(status).json({ message: error?.message || "Unable to load image" });
    }
  });

  /* ---------- News (real RSS, refreshed in the background) ---------- */
  app.get("/api/news", async (req, res) => {
    let items = await storage.getNewsItems();
    if (items.length === 0) await refreshNews(); // first load
    items = await storage.getNewsItems();

    const category = String(req.query.category ?? "Top");
    const q = String(req.query.q ?? "").trim().toLowerCase();
    let list: NewsItem[] = items;
    if (category === "Marathi") list = list.filter((n) => n.lang === "mr");
    else if (category !== "Top") list = list.filter((n) => n.categories.includes(category));
    if (category !== "Marathi") list = list.filter((n) => n.lang === "en");
    if (q) list = list.filter((n) => (n.headline + " " + n.source).toLowerCase().includes(q));
    list = [...list].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

    res.json({ items: list.slice(0, 60), updatedAt: lastUpdated, error: lastError });
  });

  app.post("/api/news/refresh", rateLimit(12, 3600_000), async (_req, res) => {
    const added = await refreshNews();
    res.json({ added, updatedAt: lastUpdated, error: lastError });
  });

  app.get("/api/news/stream", (req, res) => {
    res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    res.write(`event: hello\ndata: {}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => { clearInterval(ping); clients.delete(res); });
  });

  app.get("/api/news/:id", async (req, res) => {
    const item = await storage.getNewsItem(req.params.id);
    if (!item) return res.status(404).json({ message: "News item not found" });
    res.json(item);
  });

  /* ---------- Summaries ---------- */
  app.post("/api/news/:id/summary", aiLimit, async (req, res) => {
    try {
      const item = await storage.getNewsItem(req.params.id);
      if (!item) return res.status(404).json({ message: "News item not found" });
      const lang = langEnum.catch("en").parse(req.body?.lang);
      if (item.summary && item.summary.lang === lang) return res.json(item);

      let body = summaryInputFor(item);
      if (item.directLink) {
        try { body = (await extractFromUrl(item.url)).content; } catch { /* fall back to snippet */ }
      }
      const summary = await summarize(item.headline, body, lang);
      res.json(await storage.updateNewsItem(item.id, { summary }));
    } catch (e: any) {
      console.error("Summary error:", e);
      res.status(500).json({ message: errMsg(e, "Failed to summarise") });
    }
  });

  /* ---------- Fact-check ---------- */
  app.post("/api/fact-check", aiLimit, async (req, res) => {
    try {
      const parsed = factCheckRequestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" });
      const { url, text, lang } = parsed.data;

      if (url) {
        const cached = await storage.getFreshFactCheckByUrl(url);
        if (cached) return res.json(cached);
      }
      const result = await runFactCheck({ url, text, lang });
      await storage.saveFactCheck(result);
      res.json(result);
    } catch (e: any) {
      console.error("Fact-check error:", e);
      res.status(500).json({ message: errMsg(e, "Failed to fact-check") });
    }
  });

  // Fact-check a story from the live feed
  app.post("/api/news/:id/fact-check", aiLimit, async (req, res) => {
    try {
      const item = await storage.getNewsItem(req.params.id);
      if (!item) return res.status(404).json({ message: "News item not found" });
      const lang = langEnum.catch("en").parse(req.body?.lang);

      if (item.factCheckId) {
        const prev = await storage.getFactCheck(item.factCheckId);
        if (prev && Date.now() - +new Date(prev.createdAt) < 6 * 3600_000) return res.json(prev);
      }
      // Google News links can't be scraped server-side, so check the headline + related coverage instead.
      const result = item.directLink
        ? await runFactCheck({ url: item.url, lang }).catch(() => runFactCheck({ text: summaryInputFor(item), lang }))
        : await runFactCheck({ text: summaryInputFor(item), lang });
      result.title = item.headline;
      await storage.saveFactCheck(result);
      await storage.updateNewsItem(item.id, { factCheckId: result.id, verdict: result.verdict, accuracy: result.accuracy });
      res.json(result);
    } catch (e: any) {
      console.error("News fact-check error:", e);
      res.status(500).json({ message: errMsg(e, "Failed to fact-check this story") });
    }
  });

  app.get("/api/fact-checks/recent", async (_req, res) => res.json(await storage.getRecentFactChecks(8)));
  app.get("/api/fact-checks/:id", async (req, res) => {
    const r = await storage.getFactCheck(req.params.id);
    if (!r) return res.status(404).json({ message: "Fact-check not found" });
    res.json(r);
  });

  /* ---------- Real-time: background refresh ---------- */
  refreshNews();
  setInterval(refreshNews, Math.max(2, REFRESH_MIN) * 60_000).unref();

  return createServer(app);
}

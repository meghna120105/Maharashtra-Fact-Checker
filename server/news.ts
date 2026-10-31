import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { storage } from "./storage";
import { safeFetchText } from "./lib/net";
import { domainOf } from "./lib/sources";
import type { NewsItem, Lang } from "@shared/schema";

/* ---------- Feed configuration (edit freely) ---------- */
const gn = (q: string, lang: "en" | "mr" | "hi" = "en") => {
  const loc = { en: ["en-IN", "IN:en"], mr: ["mr", "IN:mr"], hi: ["hi", "IN:hi"] }[lang];
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:2d")}&hl=${loc[0]}&gl=IN&ceid=${loc[1]}`;
};

interface Feed { url: string; category: string; lang: Lang; google: boolean }

export const FEEDS: Feed[] = [
  // Google News topic searches (stable RSS format, aggregates many outlets)
  { url: gn("Maharashtra"), category: "Top", lang: "en", google: true },
  { url: gn("Mumbai"), category: "Mumbai", lang: "en", google: true },
  { url: gn("Pune"), category: "Pune", lang: "en", google: true },
  { url: gn("Nagpur"), category: "Nagpur", lang: "en", google: true },
  { url: gn("Maharashtra politics OR Mahayuti OR \"Maharashtra assembly\""), category: "Politics", lang: "en", google: true },
  { url: gn("Maharashtra economy OR Mumbai business OR Pune IT"), category: "Business", lang: "en", google: true },
  { url: gn("Maharashtra metro OR highway OR infrastructure OR \"Mumbai local\""), category: "Infrastructure", lang: "en", google: true },
  { url: gn("Maharashtra police OR Mumbai crime OR Pune crime"), category: "Crime", lang: "en", google: true },
  { url: gn("Maharashtra cricket OR Mumbai sports OR Pune sports"), category: "Sports", lang: "en", google: true },
  { url: gn("महाराष्ट्र", "mr"), category: "Marathi", lang: "mr", google: true },
  // Publisher-scoped Google News RSS queries keep these feeds in valid RSS format
  // while limiting results to the requested Maharashtra publishers and languages.
  { url: gn("site:loksatta.com महाराष्ट्र", "mr"), category: "Marathi", lang: "mr", google: true },
  { url: gn("site:lokmat.com महाराष्ट्र", "mr"), category: "Marathi", lang: "mr", google: true },
  { url: gn("site:maharashtratimes.com महाराष्ट्र", "mr"), category: "Marathi", lang: "mr", google: true },
  { url: gn("site:lokmat.com महाराष्ट्र", "hi"), category: "Hindi", lang: "hi", google: true },
  { url: gn("महाराष्ट्र", "hi"), category: "Hindi", lang: "hi", google: true },
  // Publisher feeds (direct article links => full-text summaries work best)
  { url: "https://indianexpress.com/section/cities/pune/feed/", category: "Pune", lang: "en", google: false },
  { url: "https://indianexpress.com/section/cities/mumbai/feed/", category: "Mumbai", lang: "en", google: false },
  { url: "https://www.hindustantimes.com/feeds/rss/cities/mumbai-news/rssfeed.xml", category: "Mumbai", lang: "en", google: false },
  { url: "https://www.hindustantimes.com/feeds/rss/cities/pune-news/rssfeed.xml", category: "Pune", lang: "en", google: false },
];

/* ---------- helpers ---------- */
const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const stripHtml = (html: string) => cheerio.load(`<div>${html}</div>`)("div").text().replace(/\s+/g, " ").trim();
const STOP = new Set(["the", "a", "an", "of", "in", "on", "to", "for", "and", "at", "is", "are", "with", "by", "as", "from", "after", "over", "says", "say", "new"]);
const tokens = (t: string) => new Set(t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => b.has(x) && inter++);
  return inter / (a.size + b.size - inter);
}

interface RawItem {
  title: string; link: string; source: string; publishedAt: string; snippet: string; imageUrl?: string;
  related: string[]; category: string; lang: Lang; google: boolean;
}

function extractRssImage($el: cheerio.Cheerio<any>): string | undefined {
  const candidates: any[] = [];
  $el.find("*").addBack().each((_, elem: any) => {
    const rawName = (elem.name || elem.tagName || "").toLowerCase();
    const localName = rawName.split(":").pop() ?? rawName;
    if (
      ["media:content", "media:thumbnail", "enclosure", "content", "thumbnail"].includes(rawName) ||
      ["media:content", "media:thumbnail", "enclosure", "content", "thumbnail"].includes(localName)
    ) {
      candidates.push(elem);
    }
  });

  for (const child of candidates) {
    const rawName = (child.name || child.tagName || "").toLowerCase();
    const localName = rawName.split(":").pop() ?? rawName;
    const url = (child.attribs?.url || "").trim();
    if (!url) continue;

    if (rawName.includes("content") || localName === "content" || rawName.includes("thumbnail") || localName === "thumbnail") {
      const type = (child.attribs?.type || "").toLowerCase();
      const medium = (child.attribs?.medium || "").toLowerCase();
      if (medium === "audio" || medium === "video" || type.startsWith("audio/") || type.startsWith("video/")) {
        continue;
      }
      return url;
    }

    if (rawName === "enclosure" || localName === "enclosure") {
      const type = (child.attribs?.type || "").toLowerCase();
      if (
        type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(url) ||
        (!type && !url.endsWith(".mp3") && !url.endsWith(".mp4"))
      ) {
        return url;
      }
    }
  }

  return undefined;
}

function parseFeed(xml: string, feed: Feed): RawItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const out: RawItem[] = [];
  $("item").each((_, el) => {
    const $el = $(el);
    let title = $el.children("title").first().text().trim();
    const link = $el.children("link").first().text().trim();
    if (!title || !link) return;
    const srcTag = $el.children("source").first();
    let source = srcTag.text().trim();
    // Google News appends " - Outlet" to titles
    if (feed.google && source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    if (!source) source = domainOf(link) || "Unknown";
    const descHtml = $el.children("description").first().text();
    const rawImageUrl = extractRssImage($el);
    let imageUrl: string | undefined;
    if (rawImageUrl) {
      try {
        const parsed = new URL(rawImageUrl, feed.url);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          if (!isKnownPlaceholderImage(parsed.toString())) imageUrl = parsed.toString();
        }
      } catch { /* invalid url */ }
    }
    const related: string[] = [];
    let snippet = "";
    if (feed.google) {
      // description is an <ol> of related coverage: "Headline  Outlet"
      const d = cheerio.load(descHtml);
      d("li").each((_, li) => {
        const t = d(li).find("a").first().text().trim();
        if (t && t !== title) related.push(t);
      });
    } else {
      snippet = stripHtml(descHtml).slice(0, 400);
    }
    const d = new Date($el.children("pubDate").first().text());
    out.push({
      title, link, source,
      publishedAt: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
      snippet, imageUrl, related: related.slice(0, 5),
      category: feed.category, lang: feed.lang, google: feed.google,
    });
  });
  return out;
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const settled = await Promise.allSettled(
    FEEDS.map(async (f) => {
      const { text } = await safeFetchText(f.url, { timeoutMs: 10000, accept: "application/rss+xml,application/xml,text/xml,*/*" });
      return parseFeed(text, f);
    }),
  );
  const raw: RawItem[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") raw.push(...r.value);
    else console.warn(`[news] feed failed: ${FEEDS[i].url.slice(0, 80)} -> ${r.reason?.message}`);
  });

  // Keep recent items only (last 72h), newest first
  const cutoff = Date.now() - 72 * 3600 * 1000;
  raw.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const fresh = raw.filter((r) => +new Date(r.publishedAt) >= cutoff);

  // Cluster near-duplicate headlines => coverage count (more outlets = better corroborated)
  const clusters: { lead: RawItem; tok: Set<string>; outlets: Set<string>; cats: Set<string>; related: Set<string> }[] = [];
  for (const item of fresh) {
    const tok = tokens(item.title);
    const hit = clusters.find((c) => c.lead.lang === item.lang && jaccard(c.tok, tok) >= 0.6);
    if (hit) {
      hit.outlets.add(item.source);
      hit.cats.add(item.category);
      item.related.forEach((r) => hit.related.add(r));
      if (hit.related.size < 6) hit.related.add(item.title);
      // prefer a direct publisher link over a Google redirect
      if (hit.lead.google && !item.google) hit.lead = { ...item, related: hit.lead.related };
    } else {
      clusters.push({ lead: item, tok, outlets: new Set([item.source]), cats: new Set([item.category]), related: new Set(item.related) });
    }
  }

  const items: NewsItem[] = [];
  for (const c of clusters) {
    const l = c.lead;
    const base: Omit<NewsItem, "category"> = {
      categories: Array.from(c.cats),
      id: hash(l.link),
      headline: l.title,
      snippet: l.snippet || undefined,
      imageUrl: l.imageUrl,
      source: l.source,
      url: l.link,
      directLink: !l.google,
      publishedAt: l.publishedAt,
      lang: l.lang,
      coverage: Math.max(c.outlets.size, 1 + Math.min(c.related.size, 4)),
      relatedHeadlines: Array.from(c.related).slice(0, 5),
    };
    // One card per story; it appears under its primary category, filter handles the rest
    items.push({ ...base, category: l.category });
  }
  const imageCounts = new Map<string, number>();
  for (const item of items) {
    if (item.imageUrl) imageCounts.set(item.imageUrl, (imageCounts.get(item.imageUrl) ?? 0) + 1);
  }
  return items.map((item) => isRepeatedPlaceholder(item, imageCounts) ? { ...item, imageUrl: undefined } : item);
}

const imageQueue = new Map<string, { item: NewsItem; onImageReady?: () => void }>();
const imageInProgress = new Set<string>();
let imageWorkers = 0;
const IMAGE_WORKER_LIMIT = 3;

function isKnownPlaceholderImage(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    const value = `${url.hostname}${url.pathname}`.toLowerCase();
    return value.includes("gnews/logo")
      || value.includes("google_news_")
      || /googleusercontent\.com\/j6_cofbog/i.test(value)
      || /\/(?:logo|placeholder)(?:\/|[-_.])/i.test(value)
      || /cities_image_ai_generated|no[-_]?image|default[-_]?image/i.test(value);
  } catch {
    return true;
  }
}

/** Reject repeated feed artwork, which Google News can attach to unrelated stories as a placeholder. */
function isRepeatedPlaceholder(item: NewsItem, counts: Map<string, number>): boolean {
  if (!item.imageUrl) return false;
  const count = counts.get(item.imageUrl) ?? 0;
  try { new URL(item.imageUrl); } catch { return true; }
  return isKnownPlaceholderImage(item.imageUrl) || count >= 3;
}

/** Fill missing thumbnails from direct publisher pages without treating Google News branding as story artwork. */
export async function scheduleImageEnrichment(items: NewsItem[], onImageReady?: () => void): Promise<void> {
  const imageCounts = new Map<string, number>();
  for (const item of items) if (item.imageUrl) imageCounts.set(item.imageUrl, (imageCounts.get(item.imageUrl) ?? 0) + 1);
  for (const item of items) {
    const placeholder = isRepeatedPlaceholder(item, imageCounts);
    if (placeholder) {
      await storage.updateNewsItem(item.id, { imageUrl: undefined });
      await storage.clearImageLookup(item.id);
      onImageReady?.(); // Refresh clients so a stale cached placeholder is replaced by the fallback.
    }
    if ((!item.imageUrl || placeholder) && !imageQueue.has(item.id) && !imageInProgress.has(item.id)) {
      if (!item.directLink) {
        await storage.markImageLookup(item.id);
        continue;
      }
      imageQueue.set(item.id, { item: placeholder ? { ...item, imageUrl: undefined } : item, onImageReady });
    }
  }
  while (imageWorkers < IMAGE_WORKER_LIMIT && imageQueue.size > 0) {
    imageWorkers++;
    void runImageWorker();
  }
}

async function runImageWorker(): Promise<void> {
  try {
    while (imageQueue.size > 0) {
      const first = imageQueue.entries().next().value as [string, { item: NewsItem; onImageReady?: () => void }] | undefined;
      if (!first) break;
      const [id, job] = first;
      const { item, onImageReady } = job;
      imageQueue.delete(id);
      imageInProgress.add(id);
      try {
        if (await storage.hasImageLookup(id)) continue;
        const { text, finalUrl } = await safeFetchText(item.url, {
          timeoutMs: 10000,
          accept: "text/html,application/xhtml+xml",
        });
        const $ = cheerio.load(text);
        // Google News landing pages expose Google branding, not the publisher's article artwork.
        if (/^https?:\/\/(?:www\.)?news\.google\.com\//i.test(finalUrl)) {
          await storage.markImageLookup(id);
          continue;
        }
        const candidates = [
          ...$("meta[property='og:image'], meta[property='og:image:secure_url'], meta[name='og:image'], meta[name='twitter:image'], meta[property='twitter:image']")
            .map((_, meta) => $(meta).attr("content"))
            .get(),
          $("link[rel='image_src']").attr("href"),
        ].filter((value): value is string => !!value?.trim());
        let selectedImage: string | undefined;
        for (const rawImage of candidates) {
          try {
            const imageUrl = new URL(rawImage.trim(), finalUrl);
            if (["http:", "https:"].includes(imageUrl.protocol) && !isKnownPlaceholderImage(imageUrl.toString())) {
              selectedImage = imageUrl.toString();
              break;
            }
          } catch { /* continue to the next image candidate */ }
        }
        if (selectedImage) {
          const updated = await storage.updateNewsItem(id, { imageUrl: selectedImage });
          if (updated) onImageReady?.();
        }
        await storage.markImageLookup(id);
      } catch (error: any) {
        console.warn(`[news] image lookup failed for ${id}: ${error?.message ?? error}`);
      } finally {
        imageInProgress.delete(id);
      }
    }
  } finally {
    imageWorkers--;
    if (imageQueue.size > 0 && imageWorkers < IMAGE_WORKER_LIMIT) {
      imageWorkers++;
      void runImageWorker();
    }
  }
}

/** Best-effort full-text fetch for summaries. Google News redirect links usually can't be resolved server-side. */
export function summaryInputFor(item: NewsItem): string {
  const parts = [`Headline: ${item.headline}`, `Source: ${item.source}`, `Published: ${item.publishedAt}`];
  if (item.snippet) parts.push(`Snippet: ${item.snippet}`);
  if (item.relatedHeadlines?.length) parts.push(`Other outlets' headlines on the same story:\n- ${item.relatedHeadlines.join("\n- ")}`);
  return parts.join("\n");
}

import * as cheerio from "cheerio";
import { safeFetchText } from "./lib/net";
import { domainOf } from "./lib/sources";
import type { Evidence } from "@shared/schema";

type RawEvidence = Omit<Evidence, "id">;

/** Recent coverage of a claim from many outlets (Google News RSS search). */
export async function searchNews(query: string, limit = 6): Promise<RawEvidence[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  try {
    const { text } = await safeFetchText(url, { timeoutMs: 10000, accept: "application/rss+xml,application/xml,*/*" });
    const $ = cheerio.load(text, { xmlMode: true });
    const out: RawEvidence[] = [];
    $("item").each((_, el) => {
      if (out.length >= limit) return false;
      const $el = $(el);
      const source = $el.children("source").first().text().trim();
      let title = $el.children("title").first().text().trim();
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
      const link = $el.children("link").first().text().trim();
      const sourceUrl = $el.children("source").first().attr("url") || link;
      const d = new Date($el.children("pubDate").first().text());
      if (title && link) out.push({ kind: "news", title, source: source || domainOf(sourceUrl), url: link, publishedAt: isNaN(d.getTime()) ? undefined : d.toISOString() });
    });
    return out;
  } catch (e: any) {
    console.warn("[evidence] news search failed:", e.message);
    return [];
  }
}

/** Existing fact-checks by professional organisations (Google Fact Check Tools API; optional key). */
export async function searchFactChecks(query: string, limit = 4): Promise<RawEvidence[]> {
  const key = process.env.GOOGLE_FACTCHECK_API_KEY;
  if (!key) return [];
  const url = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(query)}&languageCode=en&pageSize=${limit}&key=${key}`;
  try {
    const { text } = await safeFetchText(url, { timeoutMs: 10000, accept: "application/json" });
    const data = JSON.parse(text);
    const out: RawEvidence[] = [];
    for (const c of data.claims ?? []) {
      for (const r of c.claimReview ?? []) {
        out.push({
          kind: "factcheck",
          title: r.title || c.text,
          source: r.publisher?.name || domainOf(r.url),
          url: r.url,
          publishedAt: r.reviewDate,
          rating: r.textualRating,
        });
      }
    }
    return out.slice(0, limit);
  } catch (e: any) {
    console.warn("[evidence] fact-check search failed:", e.message);
    return [];
  }
}

/** Gather independent evidence for several claims. Excludes the checked article's own domain. */
export async function gatherEvidence(queries: string[], excludeDomain?: string, max = 14): Promise<Evidence[]> {
  const results = await Promise.all(queries.map(async (q) => [...(await searchFactChecks(q)), ...(await searchNews(q))]));
  const seen = new Set<string>();
  const merged: RawEvidence[] = [];
  // round-robin so every claim gets represented
  const depth = Math.max(0, ...results.map((r) => r.length));
  for (let i = 0; i < depth; i++) {
    for (const r of results) {
      const e = r[i];
      if (!e) continue;
      const dom = domainOf(e.url);
      const key = e.title.toLowerCase().slice(0, 80);
      if (seen.has(key)) continue;
      if (excludeDomain && dom && (dom === excludeDomain || dom.endsWith("." + excludeDomain))) continue;
      seen.add(key);
      merged.push(e);
    }
  }
  return merged.slice(0, max).map((e, i) => ({ ...e, id: i + 1 }));
}

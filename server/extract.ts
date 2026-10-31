import * as cheerio from "cheerio";
import { safeFetchText } from "./lib/net";
import { domainOf } from "./lib/sources";

export interface Extracted {
  title: string;
  content: string;
  publisher: string;
  publishedAt?: string;
  domain: string;
}

export async function extractFromUrl(url: string): Promise<Extracted> {
  const { text: html, finalUrl } = await safeFetchText(url);
  const $ = cheerio.load(html);

  const meta = (sel: string) => $(sel).attr("content")?.trim();
  const title = meta("meta[property='og:title']") || $("title").first().text().trim() || $("h1").first().text().trim() || "Untitled article";
  const publisher = meta("meta[property='og:site_name']") || domainOf(finalUrl);
  const publishedAt = meta("meta[property='article:published_time']") || $("time[datetime]").first().attr("datetime") || undefined;

  // Prefer structured articleBody (JSON-LD) when present
  let content = "";
  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(data) ? data : [data, ...(data["@graph"] ?? [])];
      for (const n of nodes) if (typeof n?.articleBody === "string" && n.articleBody.length > content.length) content = n.articleBody;
    } catch { /* ignore malformed JSON-LD */ }
  });

  if (content.length < 300) {
    $("script, style, nav, footer, header, aside, form, iframe, noscript, .ad, .advertisement, .sidebar, .related").remove();
    const scope = $("article").length ? $("article").first() : $("main").length ? $("main").first() : $("body");
    const paras: string[] = [];
    scope.find("p").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t.length > 40) paras.push(t);
    });
    content = paras.join("\n\n");
  }
  if (content.length < 100) content = meta("meta[property='og:description']") || meta("meta[name='description']") || content;

  content = content.replace(/\s+\n/g, "\n").trim().slice(0, 9000);
  if (content.length < 80) throw new Error("Couldn't read enough text from that page (it may be paywalled or load content with JavaScript). Try the 'Paste text' option instead.");

  return { title, content, publisher, publishedAt, domain: domainOf(finalUrl) };
}

import type { SourceCredibility } from "@shared/schema";

/**
 * Transparent, editable source classification. It does NOT claim an outlet is
 * "true" — it only tells the reader what kind of source they are looking at.
 * Extend via the EXTRA_TRUSTED_DOMAINS env var (comma separated).
 */
const GOVERNMENT = ["pib.gov.in", "maharashtra.gov.in", "mahapolice.gov.in", "india.gov.in", "mygov.in", "rbi.org.in", "imd.gov.in", "bmc.gov.in", "pmc.gov.in"];
const FACT_CHECKERS = ["altnews.in", "boomlive.in", "factchecker.in", "factly.in", "vishvasnews.com", "newschecker.in", "thequint.com", "afp.com", "factcheck.afp.com", "indiatoday.in"];
const ESTABLISHED = [
  "thehindu.com", "indianexpress.com", "hindustantimes.com", "timesofindia.indiatimes.com", "ndtv.com",
  "ptinews.com", "reuters.com", "bbc.com", "bbc.co.uk", "livemint.com", "economictimes.indiatimes.com",
  "business-standard.com", "loksatta.com", "lokmat.com", "maharashtratimes.com", "mid-day.com",
  "scroll.in", "thewire.in", "theprint.in", "deccanherald.com", "freepressjournal.in", "punemirror.com",
  "esakal.com", "saamtv.com", "abplive.com", "news18.com", "thehindubusinessline.com", "firstpost.com",
  "dnaindia.com", "indiatoday.in", "aajtak.in", "tv9marathi.com", "zeenews.india.com",
];
const SOCIAL = ["twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com", "youtu.be", "t.me", "telegram.org", "whatsapp.com", "reddit.com", "threads.net"];

const extra = (process.env.EXTRA_TRUSTED_DOMAINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

const match = (domain: string, list: string[]) => list.some((d) => domain === d || domain.endsWith("." + d));

export function classifySource(urlOrDomain: string): SourceCredibility {
  const domain = urlOrDomain.includes("/") ? domainOf(urlOrDomain) : urlOrDomain.toLowerCase();
  if (!domain) return { domain: "", tier: "UNKNOWN", note: "No source domain available." };
  if (match(domain, GOVERNMENT)) return { domain, tier: "GOVERNMENT", note: "Official government / institutional source." };
  if (match(domain, FACT_CHECKERS)) return { domain, tier: "FACT_CHECKER", note: "Known fact-checking organisation." };
  if (match(domain, ESTABLISHED) || match(domain, extra)) return { domain, tier: "ESTABLISHED", note: "Established news outlet with editorial standards. Still verify major claims." };
  if (match(domain, SOCIAL)) return { domain, tier: "SOCIAL", note: "Social media / messaging platform: user-generated, unverified by default." };
  return { domain, tier: "UNKNOWN", note: "Source is not in our list. This is not a judgement that it is unreliable — check who runs it." };
}

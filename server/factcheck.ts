import { randomUUID } from "crypto";
import { askJson } from "./lib/llm";
import { classifySource, domainOf } from "./lib/sources";
import { extractFromUrl } from "./extract";
import { gatherEvidence } from "./evidence";
import type { Claim, ClaimStatus, Confidence, Evidence, FactCheckResult, Lang, Summary, VerdictType } from "@shared/schema";

const LANG_NAME: Record<Lang, string> = { en: "English", hi: "Hindi", mr: "Marathi" };
const istNow = () =>
  new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }) + " IST";

/* ------------------------------------------------------------------ */
/* Summariser                                                          */
/* ------------------------------------------------------------------ */
export async function summarize(title: string, body: string, lang: Lang = "en"): Promise<Summary> {
  const r = await askJson<{ tldr?: string; keyPoints?: string[] }>(
    "You are a careful news summariser. Summarise ONLY what the provided text says. Never add facts, numbers or names that are not in the text. If the text is thin (e.g. just a headline), say so briefly and keep the summary short.",
    `Write the summary in ${LANG_NAME[lang]}.\nReturn JSON: {"tldr": "1-2 sentence summary", "keyPoints": ["3-5 short bullet points"]}\n\nTITLE: ${title}\n\nTEXT:\n${body.slice(0, 7000)}`,
    1200,
  );
  return { tldr: r.tldr?.trim() || "Summary unavailable.", keyPoints: (r.keyPoints ?? []).slice(0, 5), lang };
}

/* ------------------------------------------------------------------ */
/* Scoring (deterministic, so the verdict can't drift from the claims) */
/* ------------------------------------------------------------------ */
const STATUS_SCORE: Record<ClaimStatus, number> = { SUPPORTED: 100, PARTIAL: 60, UNVERIFIED: 35, CONTRADICTED: 0 };

export function deriveVerdict(claims: Claim[], evidence: Evidence[], modelVerdict?: string): { verdict: VerdictType; accuracy: number } {
  if (!claims.length) return { verdict: "UNVERIFIED", accuracy: 35 };
  const count = (s: ClaimStatus) => claims.filter((c) => c.status === s).length;
  const n = claims.length;
  const accuracy = Math.round(claims.reduce((a, c) => a + STATUS_SCORE[c.status], 0) / n);
  const contradicted = count("CONTRADICTED"), supported = count("SUPPORTED"), unverified = count("UNVERIFIED");

  let verdict: VerdictType;
  if (contradicted / n >= 0.5) verdict = "FALSE";
  else if (contradicted > 0) verdict = supported > 0 ? "MISLEADING" : "FALSE";
  else if (unverified === n) verdict = "UNVERIFIED";
  else if (supported === n) verdict = "TRUE";
  else verdict = "PARTIALLY_TRUE";

  // Never call something FALSE on thin evidence: need a fact-checker or 2+ independent outlets contradicting it.
  if (verdict === "FALSE") {
    const ids = new Set(claims.filter((c) => c.status === "CONTRADICTED").flatMap((c) => c.evidenceIds));
    const cited = evidence.filter((e) => ids.has(e.id));
    const outlets = new Set(cited.map((e) => e.source.toLowerCase()));
    if (!cited.some((e) => e.kind === "factcheck") && outlets.size < 2) verdict = "MISLEADING";
  }
  // Allow the model to flag framing problems (e.g. true facts, misleading headline) but never to upgrade a bad verdict.
  if (modelVerdict === "MISLEADING" && (verdict === "TRUE" || verdict === "PARTIALLY_TRUE")) verdict = "MISLEADING";
  return { verdict, accuracy };
}

function deriveConfidence(claims: Claim[], evidence: Evidence[]): Confidence {
  const cited = new Set(claims.flatMap((c) => c.evidenceIds));
  const used = evidence.filter((e) => cited.has(e.id));
  const outlets = new Set(used.map((e) => e.source.toLowerCase())).size;
  const hasFC = used.some((e) => e.kind === "factcheck");
  let level = outlets >= 4 ? 2 : outlets >= 2 ? 1 : 0;
  if (hasFC) level = Math.min(2, level + 1);
  return (["LOW", "MEDIUM", "HIGH"] as const)[level];
}

/* ------------------------------------------------------------------ */
/* Main pipeline                                                       */
/* ------------------------------------------------------------------ */
export async function runFactCheck(input: { url?: string; text?: string; lang?: Lang }): Promise<FactCheckResult> {
  const lang = input.lang ?? "en";
  const limitations: string[] = [];

  // 1. Get the text
  let title: string, content: string, publisher = "", domain = "";
  if (input.url) {
    const ex = await extractFromUrl(input.url);
    ({ title, content, publisher, domain } = ex);
  } else {
    content = input.text!.trim();
    title = content.slice(0, 90).replace(/\s+/g, " ") + (content.length > 90 ? "…" : "");
  }

  // 2. Extract checkable claims + search queries, and summarise in parallel
  const [extracted, summary] = await Promise.all([
    askJson<{ claims?: { claim: string; query: string }[]; isOpinionOrSatire?: boolean; notes?: string }>(
      "You extract verifiable factual claims from news text for a fact-checking pipeline.",
      `From the text below pick the 3-5 most important CHECKABLE factual claims (events, numbers, dates, named people/decisions, quotes). Ignore opinions and vague statements.
For each, write a short web search query (4-9 words, English, include place/organisation names) likely to find independent reporting on it.
Return JSON: {"claims":[{"claim":"...","query":"..."}], "isOpinionOrSatire": boolean, "notes": "optional"}

TITLE: ${title}

TEXT:
${content.slice(0, 7000)}`,
      1200,
    ),
    summarize(title, content, lang).catch(() => undefined),
  ]);

  const claimDrafts = (extracted.claims ?? []).filter((c) => c?.claim && c?.query).slice(0, 5);
  if (!claimDrafts.length) {
    limitations.push("No checkable factual claims were found in this text (it may be opinion, satire or too short).");
  }

  // 3. Gather INDEPENDENT evidence (excludes the article's own site)
  let evidence = claimDrafts.length ? await gatherEvidence(claimDrafts.map((c) => c.query), domain || undefined) : [];
  if (publisher) {
    const p = publisher.toLowerCase();
    evidence = evidence.filter((e) => !e.source.toLowerCase().includes(p)).map((e, i) => ({ ...e, id: i + 1 }));
  }
  if (!evidence.length && claimDrafts.length) limitations.push("No independent coverage was found online for these claims, so most claims are marked unverified.");

  // 4. Judge the claims against the evidence only
  let claims: Claim[] = [];
  let reasoning = "No factual claims to verify.";
  let redFlags: string[] = [];
  let modelVerdict: string | undefined;

  if (claimDrafts.length) {
    const evidenceBlock = evidence.length
      ? evidence.map((e) => `[${e.id}] (${e.kind}) ${e.source} — "${e.title}"${e.publishedAt ? ` — ${e.publishedAt.slice(0, 10)}` : ""}${e.rating ? ` — rating: ${e.rating}` : ""}`).join("\n")
      : "(no independent evidence found)";

    const judged = await askJson<{
      claims?: { claim: string; status: string; explanation: string; evidenceIds?: number[] }[];
      reasoning?: string; redFlags?: string[]; verdict?: string;
    }>(
      `You are a rigorous, impartial fact-checker for Indian (esp. Maharashtra) news. Rules:
- Judge each claim ONLY using the numbered EVIDENCE (headlines/ratings from independent outlets and fact-checkers) and the article itself. The evidence is headlines, not full articles — do not over-read it.
- SUPPORTED: independent evidence clearly agrees. CONTRADICTED: evidence clearly disagrees. PARTIAL: details differ or only partly agree. UNVERIFIED: no relevant evidence. 
- Lack of evidence means UNVERIFIED, never CONTRADICTED. Do not use background memory to mark a claim CONTRADICTED.
- Cite evidence ids you relied on. Be concise and neutral. Write explanations in ${LANG_NAME[lang]}.
- redFlags: concrete problems in the article itself (sensational wording, missing attribution, no date/source, emotionally manipulative framing, unverifiable "forwarded" style). Empty list if none.`,
      `Return JSON: {"claims":[{"claim":"","status":"SUPPORTED|PARTIAL|CONTRADICTED|UNVERIFIED","explanation":"1-2 sentences","evidenceIds":[1]}],"reasoning":"3-5 sentence overall explanation","redFlags":[""],"verdict":"TRUE|PARTIALLY_TRUE|MISLEADING|FALSE|UNVERIFIED"}

ARTICLE TITLE: ${title}
ARTICLE TEXT:
${content.slice(0, 6000)}

CLAIMS TO CHECK:
${claimDrafts.map((c, i) => `${i + 1}. ${c.claim}`).join("\n")}

EVIDENCE:
${evidenceBlock}`,
      2500,
    );

    const validIds = new Set(evidence.map((e) => e.id));
    const validStatus = new Set(["SUPPORTED", "PARTIAL", "CONTRADICTED", "UNVERIFIED"]);
    claims = (judged.claims ?? []).slice(0, 5).map((c) => {
      const ids = (c.evidenceIds ?? []).filter((id) => validIds.has(id));
      let status = (validStatus.has(c.status) ? c.status : "UNVERIFIED") as ClaimStatus;
      // A claim can't be SUPPORTED/CONTRADICTED without any cited evidence
      if (!ids.length && (status === "SUPPORTED" || status === "CONTRADICTED")) status = "UNVERIFIED";
      return { claim: c.claim, status, explanation: c.explanation ?? "", evidenceIds: ids };
    });
    reasoning = judged.reasoning ?? reasoning;
    redFlags = (judged.redFlags ?? []).filter(Boolean).slice(0, 6);
    modelVerdict = judged.verdict;
  }

  const { verdict, accuracy } = deriveVerdict(claims, evidence, modelVerdict);
  const confidence = deriveConfidence(claims, evidence);

  limitations.push("Evidence consists of headlines and ratings from other outlets, not their full articles. Treat this as a fast first-pass check, not a final ruling.");
  if (extracted.isOpinionOrSatire) limitations.push("This text looks like opinion or satire, which can't be fact-checked the same way.");

  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    inputType: input.url ? "url" : "text",
    url: input.url ?? "",
    title,
    verdict,
    accuracy,
    confidence,
    summary,
    claims,
    reasoning,
    redFlags,
    evidence,
    sourceCredibility: input.url ? classifySource(domain || domainOf(input.url)) : undefined,
    limitations,
    lastVerified: istNow(),
    createdAt: now,
  };
}

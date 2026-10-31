import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VerdictBadge from "./VerdictBadge";
import AccuracyMeter from "./AccuracyMeter";
import { AlertTriangle, Calendar, CheckCircle2, Copy, ExternalLink, HelpCircle, Info, MessageCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ClaimStatus, FactCheckResult as FactCheckData } from "@shared/schema";

interface Props {
  data: FactCheckData;
  onNewCheck?: () => void;
}

const claimUi: Record<ClaimStatus, { label: string; icon: typeof Info; cls: string }> = {
  SUPPORTED: { label: "Supported", icon: CheckCircle2, cls: "text-primary" },
  PARTIAL: { label: "Partly supported", icon: Info, cls: "text-muted-foreground" },
  CONTRADICTED: { label: "Contradicted", icon: XCircle, cls: "text-destructive" },
  UNVERIFIED: { label: "Unverified", icon: HelpCircle, cls: "text-muted-foreground" },
};

const confidenceNote = {
  LOW: "Low confidence: little independent coverage found.",
  MEDIUM: "Medium confidence: a couple of independent outlets cover this.",
  HIGH: "High confidence: several independent sources (or a fact-checker) cover this.",
};

export default function FactCheckResult({ data, onNewCheck }: Props) {
  const { toast } = useToast();
  const evById = new Map(data.evidence.map((e) => [e.id, e]));

  const copyReport = async () => {
    const lines = [
      `Fact-check: ${data.title}`,
      `Verdict: ${data.verdict.replace("_", " ")} (${data.accuracy}% evidence-backed, ${data.confidence.toLowerCase()} confidence)`,
      ...data.claims.map((c) => `• [${c.status}] ${c.claim}`),
      `Checked ${data.lastVerified} — Maharashtra Fact-Checker`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast({ title: "Report copied", description: "Ready to paste into WhatsApp or a message." });
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const shareText = [
    `Fact-check: ${data.title}`,
    `Verdict: ${data.verdict.replaceAll("_", " ")} (${data.accuracy}% evidence-backed)`,
    `Read the report: ${window.location.origin}/check/${encodeURIComponent(data.id)}`,
  ].join("\n");

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="component-fact-check-result">
      <div className="flex justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={copyReport} data-testid="button-copy-report"><Copy className="h-4 w-4 mr-2" />Copy report</Button>
          <Button asChild variant="outline" data-testid="button-share-whatsapp">
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />Share on WhatsApp
            </a>
          </Button>
        </div>
        {onNewCheck && <Button variant="outline" onClick={onNewCheck} data-testid="button-new-check">Back to news</Button>}
      </div>

      <Card>
        <CardHeader className="space-y-6 pb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold mb-2 break-words" data-testid="text-article-title">{data.title}</CardTitle>
              {data.url && (
                <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1" data-testid="link-article-url">
                  <ExternalLink className="h-4 w-4" />View original article
                </a>
              )}
            </div>
            <VerdictBadge verdict={data.verdict} size="lg" />
          </div>
          <AccuracyMeter accuracy={data.accuracy} />
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <Badge variant="outline">{data.confidence} confidence</Badge>
            <span>{confidenceNote[data.confidence]}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {data.summary && (
            <section>
              <h3 className="text-base font-semibold mb-2">Summary</h3>
              <p className="text-sm leading-relaxed" data-testid="text-summary">{data.summary.tldr}</p>
              <ul className="mt-2 text-sm text-muted-foreground list-disc pl-5 space-y-1">
                {data.summary.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </section>
          )}

          {data.sourceCredibility && (
            <section className="text-sm">
              <h3 className="text-base font-semibold mb-2">About the source</h3>
              <p><span className="font-medium">{data.sourceCredibility.domain}</span> — <Badge variant="secondary">{data.sourceCredibility.tier.replace("_", " ")}</Badge></p>
              <p className="text-muted-foreground mt-1">{data.sourceCredibility.note}</p>
            </section>
          )}

          <section>
            <h3 className="text-base font-semibold mb-3">Claim by claim</h3>
            {data.claims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No checkable claims found.</p>
            ) : (
              <ul className="space-y-4">
                {data.claims.map((c, i) => {
                  const ui = claimUi[c.status];
                  const Icon = ui.icon;
                  return (
                    <li key={i} className="border rounded-md p-4 space-y-2" data-testid={`claim-${i}`}>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${ui.cls}`}><Icon className="h-4 w-4" />{ui.label}</div>
                      <p className="text-sm font-medium">{c.claim}</p>
                      <p className="text-sm text-muted-foreground">{c.explanation}</p>
                      {c.evidenceIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {c.evidenceIds.map((id) => {
                            const e = evById.get(id);
                            return e ? (
                              <a key={id} href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-muted-foreground hover:text-foreground">[{id}] {e.source}</a>
                            ) : null;
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-base font-semibold mb-2">Why this rating</h3>
            <p className="text-sm leading-relaxed" data-testid="text-reasoning">{data.reasoning}</p>
          </section>

          {data.redFlags.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Red flags in the text</h3>
              <ul className="text-sm space-y-1 list-disc pl-5">{data.redFlags.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          )}

          <section>
            <h3 className="text-base font-semibold mb-3">Independent sources found</h3>
            {data.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No independent coverage found.</p>
            ) : (
              <ul className="space-y-2">
                {data.evidence.map((e) => (
                  <li key={e.id} className="text-sm flex items-start gap-2" data-testid={`text-source-${e.id}`}>
                    <span className="text-muted-foreground w-6 shrink-0">[{e.id}]</span>
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      <span className="font-medium">{e.source}</span>{e.kind === "factcheck" && <Badge className="ml-2" variant="secondary">fact-check{e.rating ? `: ${e.rating}` : ""}</Badge>}
                      <span className="text-muted-foreground"> — {e.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md bg-muted p-4 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold">Limitations</div>
            {data.limitations.map((l, i) => <p key={i}>{l}</p>)}
          </section>

          <div className="pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4" /><span data-testid="text-last-verified">Last verified: {data.lastVerified}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

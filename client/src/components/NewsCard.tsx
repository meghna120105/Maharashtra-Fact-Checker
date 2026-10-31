import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import VerdictBadge from "./VerdictBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Loader2, Newspaper, ShieldCheck, Sparkles, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { NewsItem } from "@shared/schema";

interface NewsCardProps {
  news: NewsItem;
  onSummarize?: (id: string) => void;
  onFactCheck?: (id: string) => void;
  onOpenCheck?: (checkId: string) => void;
  summarizing?: boolean;
  checking?: boolean;
}

export default function NewsCard({ news, onSummarize, onFactCheck, onOpenCheck, summarizing, checking }: NewsCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const ago = formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true });
  const isNew = Date.now() - new Date(news.publishedAt).getTime() < 30 * 60 * 1000
    && Date.now() >= new Date(news.publishedAt).getTime();

  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [news.imageUrl]);

  return (
    <Card className="news-card soft-enter group h-full flex flex-col overflow-hidden rounded-2xl bg-card" data-testid={`card-news-${news.id}`}>
      <CardHeader className="space-y-3 p-5 pb-3 sm:p-5 sm:pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs uppercase tracking-wide">{news.category}</Badge>
            {isNew && <Badge className="text-xs" data-testid={`badge-new-${news.id}`}>NEW</Badge>}
          </div>
          {news.verdict ? <VerdictBadge verdict={news.verdict} size="sm" /> : (
            <Badge variant="outline" className="text-xs">Not checked yet</Badge>
          )}
        </div>
        <h3 className="line-clamp-3 text-[15px] font-bold leading-snug tracking-[-.015em] transition-colors group-hover:text-primary sm:text-base" data-testid={`text-headline-${news.id}`}>{news.headline}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">{news.source}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ago}</span>
          {news.coverage > 1 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{news.coverage} outlets</span>}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4 px-5 pb-5 pt-2">
        <div className="news-image relative aspect-video overflow-hidden rounded-xl bg-muted" data-testid={`image-news-${news.id}`}>
          {news.imageUrl && !imageFailed ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
              <img
                src={`/api/img?u=${encodeURIComponent(news.imageUrl)}`}
                alt=""
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageFailed(true)}
                className={`h-full w-full object-cover transition-opacity ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-muted to-background" aria-hidden="true">
              <Newspaper className="h-10 w-10 text-primary/25" strokeWidth={1.25} />
            </div>
          )}
          <span className="absolute bottom-2 right-2 max-w-[75%] truncate rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur">{news.source}</span>
        </div>

        {news.summary ? (
          <div className="space-y-2" data-testid={`text-summary-${news.id}`}>
            <p className="line-clamp-3 text-sm leading-relaxed text-foreground/85">{news.summary.tldr}</p>
            {news.summary.keyPoints.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                {news.summary.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            )}
          </div>
        ) : (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {news.snippet || "Tap “Summarize” for an AI summary of this story."}
          </p>
        )}

        <div className="space-y-2">
          {typeof news.accuracy === "number" && (
            <div className="text-xs font-semibold text-muted-foreground" data-testid={`text-accuracy-${news.id}`}>{news.accuracy}% evidence-backed</div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" disabled={summarizing} onClick={() => onSummarize?.(news.id)} className="rounded-xl border-border/80 transition-all hover:border-primary/30 hover:bg-secondary/70" data-testid={`button-summarize-${news.id}`}>
              {summarizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {news.summary ? "Re-summarize" : "Summarize"}
            </Button>
            {news.factCheckId ? (
              <Button size="sm" onClick={() => onOpenCheck?.(news.factCheckId!)} className="rounded-xl shadow-sm transition-all hover:-translate-y-0.5" data-testid={`button-view-check-${news.id}`}>
                <ShieldCheck className="h-4 w-4 mr-2" />View check
              </Button>
            ) : (
              <Button size="sm" disabled={checking} onClick={() => onFactCheck?.(news.id)} className="rounded-xl shadow-sm transition-all hover:-translate-y-0.5" data-testid={`button-fact-check-${news.id}`}>
                {checking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Fact-check
              </Button>
            )}
          </div>
          <a href={news.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary" data-testid={`link-source-${news.id}`}>
            <ExternalLink className="h-3 w-3" />Read original
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

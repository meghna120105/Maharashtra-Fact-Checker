import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import URLChecker, { type VerifyInput } from "@/components/URLChecker";
import FactCheckResult from "@/components/FactCheckResult";
import HowItWorks from "@/components/HowItWorks";
import NewsFeed from "@/components/NewsFeed";
import VerdictBadge from "@/components/VerdictBadge";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useLiveNews } from "@/hooks/use-live-news";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NEWS_CATEGORIES, type FactCheckResult as FactCheckData, type Lang, type NewsItem } from "@shared/schema";

interface NewsResponse { items: NewsItem[]; updatedAt: string | null; error: string | null }

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिंदी" },
  { id: "mr", label: "मराठी" },
];

export default function Home() {
  const [result, setResult] = useState<FactCheckData | null>(null);
  const [category, setCategory] = useState<string>("Top");
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [busySummary, setBusySummary] = useState<string | null>(null);
  const [busyCheck, setBusyCheck] = useState<string | null>(null);
  const { toast } = useToast();
  const live = useLiveNews();

  const fail = (title: string) => (e: Error) => toast({ title, description: e.message, variant: "destructive" });
  const newsKey = `/api/news?category=${encodeURIComponent(category)}&q=${encodeURIComponent(search)}`;

  const newsQuery = useQuery<NewsResponse>({
    queryKey: [newsKey],
    refetchInterval: 5 * 60 * 1000, // fallback polling in case the live stream drops
    staleTime: 60 * 1000,
  });

  const recentQuery = useQuery<FactCheckData[]>({ queryKey: ["/api/fact-checks/recent"], staleTime: 30 * 1000 });

  const factCheckMutation = useMutation({
    mutationFn: async (input: VerifyInput) => (await (await apiRequest("POST", "/api/fact-check", { ...input, lang })).json()) as FactCheckData,
    onSuccess: (data) => { setResult(data); queryClient.invalidateQueries({ queryKey: ["/api/fact-checks/recent"] }); },
    onError: fail("Verification failed"),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/news/refresh")).json(),
    onSuccess: () => { live.showNew(); },
    onError: fail("Refresh failed"),
  });

  const patchItem = (updated: NewsItem) =>
    queryClient.setQueryData<NewsResponse>([newsKey], (old) =>
      old ? { ...old, items: old.items.map((n) => (n.id === updated.id ? updated : n)) } : old);

  const summarize = async (id: string) => {
    setBusySummary(id);
    try {
      const updated = (await (await apiRequest("POST", `/api/news/${id}/summary`, { lang })).json()) as NewsItem;
      patchItem(updated);
    } catch (e: any) { fail("Couldn't summarize")(e); } finally { setBusySummary(null); }
  };

  const factCheckStory = async (id: string) => {
    setBusyCheck(id);
    try {
      const data = (await (await apiRequest("POST", `/api/news/${id}/fact-check`, { lang })).json()) as FactCheckData;
      setResult(data);
      queryClient.invalidateQueries({ queryKey: [newsKey] });
      queryClient.invalidateQueries({ queryKey: ["/api/fact-checks/recent"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { fail("Couldn't fact-check this story")(e); } finally { setBusyCheck(null); }
  };

  const openCheck = async (checkId: string) => {
    try {
      setResult((await (await apiRequest("GET", `/api/fact-checks/${checkId}`)).json()) as FactCheckData);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) { fail("Couldn't open that check")(e); }
  };

  const data = newsQuery.data;

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {!result ? (
          <>
            <HeroSection />
            <section className="px-4 py-4 sm:px-6 sm:py-6">
              <URLChecker onVerify={(i) => { setResult(null); factCheckMutation.mutate(i); }} isLoading={factCheckMutation.isPending} />
            </section>

            {recentQuery.data && recentQuery.data.length > 0 && (
              <section className="px-4 pb-8 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent checks</h2>
                  <ul className="space-y-2">
                    {recentQuery.data.slice(0, 5).map((r) => (
                      <li key={r.id}>
                        <button onClick={() => setResult(r)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left shadow-sm transition-all hover:border-primary/25 hover:shadow-md" data-testid={`recent-${r.id}`}>
                          <span className="text-sm truncate">{r.title}</span>
                          <VerdictBadge verdict={r.verdict} size="sm" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <HowItWorks />

            <section id="news" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20">
              <div className="mx-auto max-w-7xl space-y-7 sm:space-y-9">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                  <p className="eyebrow text-[10px] font-bold uppercase">The latest from the state</p>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" data-testid="text-daily-news-title">Maharashtra Live News</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${live.connected ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                    {live.connected ? "Live" : "Reconnecting…"}
                    {data?.updatedAt && <> · updated {formatDistanceToNow(new Date(data.updatedAt), { addSuffix: true })}</>}
                  </p>
                  </div>
                  <p className="max-w-md text-xs leading-5 text-muted-foreground">Headlines come from real news outlets. Stories remain unchecked until you choose to run a fact-check.</p>
                </div>

                {data?.items.length ? (
                  <div className="ticker-strip thin-scroll flex items-center gap-4 overflow-x-auto rounded-2xl border border-border/70 px-4 py-3" aria-label="Five newest headlines" data-testid="breaking-ticker">
                    <Badge className="shrink-0 rounded-full px-3">LATEST</Badge>
                    {[...data.items]
                      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
                      .slice(0, 5)
                      .map((item) => {
                        const isStoryNew =
                          Date.now() - new Date(item.publishedAt).getTime() < 30 * 60 * 1000 &&
                          Date.now() >= new Date(item.publishedAt).getTime();
                        return (
                          <div key={item.id} className="flex items-center gap-1.5 shrink-0 max-w-xs">
                            {isStoryNew && (
                              <Badge className="text-[10px] px-1.5 py-0 h-4 shrink-0" data-testid={`ticker-badge-new-${item.id}`}>
                                NEW
                              </Badge>
                            )}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-sm font-medium text-foreground/80 transition-colors hover:text-primary hover:underline"
                              data-testid={`ticker-headline-${item.id}`}
                            >
                              {item.headline}
                            </a>
                          </div>
                        );
                      })}
                  </div>
                ) : null}

                <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm sm:p-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="thin-scroll flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0" data-testid="category-chips">
                    {NEWS_CATEGORIES.map((c) => (
                      <Button key={c} size="sm" variant={category === c ? "default" : "outline"} className="shrink-0 rounded-full px-4" onClick={() => setCategory(c)} data-testid={`chip-${c}`}>{c}</Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <div className="relative min-w-0 basis-full sm:basis-auto sm:flex-none">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="h-10 w-full rounded-xl border-border/80 bg-background pl-8 sm:w-48" placeholder="Search stories" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search" />
                    </div>
                    <div className="flex shrink-0 gap-1 rounded-xl bg-muted/70 p-1" title="Language for summaries and explanations">
                      {LANGS.map((l) => (
                      <Button key={l.id} size="sm" variant={lang === l.id ? "default" : "ghost"} className="rounded-lg" onClick={() => setLang(l.id)} data-testid={`lang-${l.id}`}>{l.label}</Button>
                      ))}
                    </div>
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-background" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} data-testid="button-refresh-news">
                      {refreshMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {live.newCount > 0 && (
                  <div className="flex justify-center">
                    <Badge className="cursor-pointer px-4 py-2" onClick={live.showNew} data-testid="badge-new-stories">↑ {live.newCount} new {live.newCount === 1 ? "story" : "stories"} — tap to load</Badge>
                  </div>
                )}

                {newsQuery.isLoading ? (
                  <Card className="rounded-2xl border-border/70 bg-card/80"><CardContent className="py-16 flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Fetching the latest Maharashtra headlines…</p>
                  </CardContent></Card>
                ) : newsQuery.error ? (
                  <Card className="rounded-2xl border-border/70 bg-card/80"><CardContent className="py-16 text-center">
                    <p className="text-sm text-muted-foreground mb-4">Could not load news.</p>
                    <Button variant="outline" onClick={() => newsQuery.refetch()} data-testid="button-retry-news">Try again</Button>
                  </CardContent></Card>
                ) : data && data.items.length > 0 ? (
                  <NewsFeed news={data.items} onSummarize={summarize} onFactCheck={factCheckStory} onOpenCheck={openCheck} busySummary={busySummary} busyCheck={busyCheck} />
                ) : (
                  <Card className="rounded-2xl border-border/70 bg-card/80"><CardContent className="py-16 text-center text-sm text-muted-foreground">
                    {data?.error ? `No stories yet: ${data.error}` : "No stories match this filter."}
                  </CardContent></Card>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="py-12 px-6"><FactCheckResult data={result} onNewCheck={() => setResult(null)} /></section>
        )}
      </main>
      <Footer />
    </div>
  );
}

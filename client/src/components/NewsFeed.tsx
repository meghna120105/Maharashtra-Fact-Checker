import NewsCard from "./NewsCard";
import type { NewsItem } from "@shared/schema";

interface NewsFeedProps {
  news: NewsItem[];
  onSummarize: (id: string) => void;
  onFactCheck: (id: string) => void;
  onOpenCheck: (checkId: string) => void;
  busySummary?: string | null;
  busyCheck?: string | null;
}

export default function NewsFeed({ news, onSummarize, onFactCheck, onOpenCheck, busySummary, busyCheck }: NewsFeedProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6" data-testid="component-news-feed">
      {news.map((item) => (
        <NewsCard
          key={item.id}
          news={item}
          onSummarize={onSummarize}
          onFactCheck={onFactCheck}
          onOpenCheck={onOpenCheck}
          summarizing={busySummary === item.id}
          checking={busyCheck === item.id}
        />
      ))}
    </div>
  );
}

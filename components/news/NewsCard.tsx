"use client";

import type { NewsArticle } from "@/lib/types/causal";

interface NewsCardProps {
  article: NewsArticle;
  selected: boolean;
  onToggle: () => void;
}

export default function NewsCard({ article, selected, onToggle }: NewsCardProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full rounded border p-2.5 text-left transition-colors ${
        selected
          ? "border-accent/50 bg-accent/10"
          : "border-border bg-card hover:border-border hover:bg-card/80"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`mt-0.5 h-3 w-3 flex-shrink-0 rounded-sm border ${
            selected ? "border-accent bg-accent" : "border-dim"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-2">
            {article.title}
          </p>
          <p className="mt-1 text-[9px] text-dim line-clamp-2 leading-relaxed">
            {article.content?.slice(0, 120)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[8px] text-dim">
            <span>{article.source}</span>
            {article.publishedDate && <span>{article.publishedDate.slice(0, 10)}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

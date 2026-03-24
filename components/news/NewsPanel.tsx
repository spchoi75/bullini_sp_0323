"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCausalStore } from "@/lib/store/causal-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import NewsCard from "./NewsCard";
import type { NewsArticle } from "@/lib/types/causal";

export default function NewsPanel() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const newsArticles = useCausalStore((s) => s.newsArticles);
  const selectedArticles = useCausalStore((s) => s.selectedArticles);
  const setNewsArticles = useCausalStore((s) => s.setNewsArticles);
  const toggleArticleSelection = useCausalStore((s) => s.toggleArticleSelection);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(`검색 실패: ${res.status}`);
      const data = await res.json();
      setNewsArticles(data.articles ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "뉴스 검색 실패");
    } finally {
      setSearching(false);
    }
  };

  if (newsArticles.length === 0) {
    return (
      <div className="p-3">
        <div className="mb-2 text-[10px] font-bold tracking-wider text-dim">
          뉴스 검색
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="flex gap-1.5"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="키워드 검색..."
            className="h-7 flex-1 border-border bg-card text-[10px] placeholder:text-dim"
          />
          <Button
            type="submit"
            size="sm"
            disabled={searching || !query.trim()}
            className="h-7 px-2 text-[10px] bg-accent text-background"
          >
            {searching ? "..." : "검색"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider text-dim">
          뉴스 {newsArticles.length}건
          {selectedArticles.length > 0 && (
            <span className="ml-1 text-accent">({selectedArticles.length}선택)</span>
          )}
        </span>
        <button
          onClick={() => setNewsArticles([])}
          className="text-[9px] text-dim hover:text-soft"
        >
          닫기
        </button>
      </div>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
        {newsArticles.map((article: NewsArticle, i: number) => (
          <NewsCard
            key={i}
            article={article}
            selected={selectedArticles.some((a) => a.url === article.url)}
            onToggle={() => toggleArticleSelection(article)}
          />
        ))}
      </div>
    </div>
  );
}

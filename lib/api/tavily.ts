const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  score: number;
}

export async function searchNews(query: string, maxResults = 10): Promise<TavilyResult[]> {
  if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY not configured");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_answer: false,
      topic: "news",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.results ?? [];
}

/** 여러 쿼리를 병렬 검색하고 중복 제거 후 합침 */
export async function searchMultiQuery(
  queries: string[],
  maxPerQuery = 8
): Promise<TavilyResult[]> {
  const allResults = await Promise.all(
    queries.map((q) => searchNews(q, maxPerQuery).catch(() => []))
  );

  // URL 기준 중복 제거
  const seen = new Set<string>();
  const merged: TavilyResult[] = [];
  for (const results of allResults) {
    for (const r of results) {
      if (!seen.has(r.url)) {
        seen.add(r.url);
        merged.push(r);
      }
    }
  }
  return merged;
}

/** 뉴스를 요약 텍스트로 변환 (LLM 입력용) */
export function newsToSummaryText(results: TavilyResult[], maxItems = 15): string {
  return results
    .slice(0, maxItems)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content?.slice(0, 200) ?? ""}\nURL: ${r.url}`)
    .join("\n\n");
}

/** 뉴스를 힌트 키워드 텍스트로 변환 */
export function newsToHintText(results: TavilyResult[], maxItems = 10): string {
  return results
    .slice(0, maxItems)
    .map((r, i) => `[${i + 1}] ${r.title}: ${r.content?.slice(0, 150) ?? ""}`)
    .join("\n");
}

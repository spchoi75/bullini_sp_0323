import { NextRequest, NextResponse } from "next/server";
import { searchNews } from "@/lib/api/tavily";

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const results = await searchNews(query, 15);

    const articles = results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      publishedDate: r.published_date ?? "",
      source: new URL(r.url).hostname,
    }));

    return NextResponse.json({ articles });
  } catch (err) {
    console.error("News search failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `뉴스 검색 실패: ${message}` },
      { status: 500 }
    );
  }
}

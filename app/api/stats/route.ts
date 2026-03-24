import { NextRequest, NextResponse } from "next/server";

const PYTHON_STATS_URL = process.env.PYTHON_STATS_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const { endpoint, payload } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 }
      );
    }

    const res = await fetch(`${PYTHON_STATS_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Python stats server error ${res.status}: ${text}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Stats proxy failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `통계 서버 실패: ${message}` },
      { status: 500 }
    );
  }
}

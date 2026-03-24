import { NextRequest, NextResponse } from "next/server";
import { getFredSeries } from "@/lib/api/fred";

export async function POST(req: NextRequest) {
  try {
    const { seriesId, startDate, endDate } = await req.json();

    if (!seriesId) {
      return NextResponse.json(
        { error: "seriesId is required" },
        { status: 400 }
      );
    }

    const observations = await getFredSeries(seriesId, startDate, endDate);

    return NextResponse.json({
      seriesId,
      count: observations.length,
      observations: observations.map((o) => ({
        date: o.date,
        value: parseFloat(o.value),
      })),
    });
  } catch (err) {
    console.error("FRED API failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `FRED API 실패: ${message}` },
      { status: 500 }
    );
  }
}

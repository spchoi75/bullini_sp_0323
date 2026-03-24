import { NextRequest, NextResponse } from "next/server";
import { getDartFinancials } from "@/lib/api/dart";

export async function POST(req: NextRequest) {
  try {
    const { corpCode, bsnsYear, reprtCode } = await req.json();

    if (!corpCode || !bsnsYear) {
      return NextResponse.json(
        { error: "corpCode and bsnsYear are required" },
        { status: 400 }
      );
    }

    const financials = await getDartFinancials(corpCode, bsnsYear, reprtCode);

    return NextResponse.json({ financials });
  } catch (err) {
    console.error("DART API failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `DART API 실패: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * Yahoo Finance 데이터 — Python yfinance를 통해 조회
 * Next.js에서 직접 호출 불가이므로, Python 서버에 엔드포인트 추가
 */

const PYTHON_STATS_URL = process.env.PYTHON_STATS_URL ?? "http://localhost:8000";

export interface YahooQuote {
  date: string;
  close: number;
  volume: number;
}

export async function getYahooHistory(
  symbol: string,
  period: string = "5y", // 1y, 2y, 5y, 10y, max
  interval: string = "1d" // 1d, 1wk, 1mo
): Promise<YahooQuote[]> {
  const res = await fetch(`${PYTHON_STATS_URL}/data/yahoo-finance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, period, interval }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yahoo Finance error ${res.status}: ${text}`);
  }

  return res.json();
}

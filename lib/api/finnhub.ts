const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export interface FinnhubCandle {
  c: number[]; // close prices
  h: number[]; // high
  l: number[]; // low
  o: number[]; // open
  t: number[]; // timestamps (unix)
  v: number[]; // volumes
  s: string; // status
}

export async function getStockCandles(
  symbol: string,
  resolution: string = "D", // D=daily, W=weekly, M=monthly
  from: number, // unix timestamp
  to: number // unix timestamp
): Promise<FinnhubCandle> {
  if (!FINNHUB_API_KEY) throw new Error("FINNHUB_API_KEY not configured");

  const params = new URLSearchParams({
    symbol,
    resolution,
    from: String(from),
    to: String(to),
    token: FINNHUB_API_KEY,
  });

  const res = await fetch(`https://finnhub.io/api/v1/stock/candle?${params}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Finnhub API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.s === "no_data") {
    throw new Error(`Finnhub: no data for ${symbol}`);
  }
  return data;
}

export async function getQuote(symbol: string) {
  if (!FINNHUB_API_KEY) throw new Error("FINNHUB_API_KEY not configured");

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Finnhub quote error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function symbolSearch(query: string) {
  if (!FINNHUB_API_KEY) throw new Error("FINNHUB_API_KEY not configured");

  const res = await fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Finnhub search error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.result ?? [];
}

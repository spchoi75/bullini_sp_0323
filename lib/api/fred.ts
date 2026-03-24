const FRED_API_KEY = process.env.FRED_API_KEY;

export interface FredObservation {
  date: string;
  value: string;
}

export async function getFredSeries(
  seriesId: string,
  startDate?: string,
  endDate?: string
): Promise<FredObservation[]> {
  if (!FRED_API_KEY) throw new Error("FRED_API_KEY not configured");

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: "json",
  });
  if (startDate) params.set("observation_start", startDate);
  if (endDate) params.set("observation_end", endDate);

  const res = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?${params}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FRED API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.observations ?? []).filter(
    (o: FredObservation) => o.value !== "."
  );
}

export async function searchFredSeries(query: string) {
  if (!FRED_API_KEY) throw new Error("FRED_API_KEY not configured");

  const params = new URLSearchParams({
    search_text: query,
    api_key: FRED_API_KEY,
    file_type: "json",
    limit: "10",
  });

  const res = await fetch(
    `https://api.stlouisfed.org/fred/series/search?${params}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FRED search error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.seriess ?? [];
}

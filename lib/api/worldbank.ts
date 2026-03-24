/**
 * World Bank Open Data API — 키 불필요
 * GDP, 무역, 산업생산 등 글로벌 매크로 데이터
 */

export interface WBDataPoint {
  date: string;
  value: number | null;
  country: string;
}

export async function getWorldBankIndicator(
  countryCode: string, // KR, US, CN, JP
  indicatorId: string, // NY.GDP.MKTP.CD (GDP), NE.EXP.GNFS.CD (수출)
  startYear?: number,
  endYear?: number
): Promise<WBDataPoint[]> {
  const dateRange = startYear && endYear ? `date=${startYear}:${endYear}` : "date=2010:2026";

  const res = await fetch(
    `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorId}?${dateRange}&format=json&per_page=100`
  );

  if (!res.ok) {
    throw new Error(`World Bank API error ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length < 2) return [];

  return (data[1] ?? [])
    .filter((d: { value: number | null }) => d.value != null)
    .map((d: { date: string; value: number; country: { value: string } }) => ({
      date: d.date,
      value: d.value,
      country: d.country.value,
    }))
    .reverse(); // 오래된 순서로
}

/** 주요 World Bank 지표 ID */
export const WB_INDICATORS = {
  GDP: "NY.GDP.MKTP.CD", // GDP (current US$)
  GDP_GROWTH: "NY.GDP.MKTP.KD.ZG", // GDP growth (annual %)
  EXPORTS: "NE.EXP.GNFS.CD", // Exports (current US$)
  IMPORTS: "NE.IMP.GNFS.CD", // Imports (current US$)
  TRADE_PCT_GDP: "NE.TRD.GNFS.ZS", // Trade (% of GDP)
  INFLATION: "FP.CPI.TOTL.ZG", // Inflation (annual %)
  UNEMPLOYMENT: "SL.UEM.TOTL.ZS", // Unemployment (%)
  FDI: "BX.KLT.DINV.CD.WD", // Foreign direct investment
  HIGH_TECH_EXPORT: "TX.VAL.TECH.MF.ZS", // High-tech exports (% of manufactured)
  INDUSTRY_PCT_GDP: "NV.IND.TOTL.ZS", // Industry (% of GDP)
} as const;

/** 주요 국가 코드 */
export const WB_COUNTRIES = {
  KOREA: "KR",
  USA: "US",
  CHINA: "CN",
  JAPAN: "JP",
  TAIWAN: "TW",
  GERMANY: "DE",
  WORLD: "WLD",
} as const;

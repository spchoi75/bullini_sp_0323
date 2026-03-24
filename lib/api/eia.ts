/**
 * EIA (미국 에너지정보청) API — 유가, 가스, 에너지 데이터
 */

const EIA_API_KEY = process.env.EIA_API_KEY;

export interface EIADataPoint {
  period: string;
  value: number;
}

export async function getEIASeries(
  seriesId: string, // PET.RWTC.D (WTI crude), NG.RNGWHHD.D (Henry Hub gas)
  frequency: string = "monthly", // daily, weekly, monthly, annual
  startDate?: string
): Promise<EIADataPoint[]> {
  if (!EIA_API_KEY) throw new Error("EIA_API_KEY not configured");

  const params = new URLSearchParams({
    api_key: EIA_API_KEY,
    frequency,
    "data[0]": "value",
    sort: JSON.stringify([{ column: "period", direction: "asc" }]),
  });
  if (startDate) params.set("start", startDate);

  const res = await fetch(
    `https://api.eia.gov/v2/petroleum/pri/spt/data?${params}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EIA API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.response?.data ?? []).map(
    (d: { period: string; value: number }) => ({
      period: d.period,
      value: d.value,
    })
  );
}

/** 주요 EIA 시리즈 */
export const EIA_SERIES = {
  WTI_CRUDE: "PET.RWTC.D", // WTI 원유 가격 (일별)
  BRENT_CRUDE: "PET.RBRTE.D", // 브렌트 원유
  NATURAL_GAS: "NG.RNGWHHD.D", // 천연가스 (Henry Hub)
  GASOLINE: "PET.EMM_EPM0_PTE_NUS_DPG.W", // 휘발유 소매가
} as const;

/**
 * ECOS (한국은행 경제통계시스템) API
 * 한국 금리, 환율, GDP, CPI, 산업생산, 수출입 등
 */

const ECOS_API_KEY = process.env.ECOS_API_KEY;

export interface ECOSDataPoint {
  date: string;
  value: number;
}

export async function getECOSSeries(
  statCode: string, // 통계표코드
  itemCode1: string, // 통계항목코드1
  frequency: string = "M", // D=일, M=월, Q=분기, A=연
  startDate: string = "201001",
  endDate: string = "202612",
  itemCode2?: string,
  itemCode3?: string
): Promise<ECOSDataPoint[]> {
  if (!ECOS_API_KEY) throw new Error("ECOS_API_KEY not configured — 한국은행 ECOS API 키가 필요합니다. https://ecos.bok.or.kr/api/#/ 에서 발급하세요.");

  const items = [itemCode1, itemCode2 ?? "", itemCode3 ?? ""].join("/");
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ECOS_API_KEY}/json/kr/1/1000/${statCode}/${frequency}/${startDate}/${endDate}/${items}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ECOS API error ${res.status}`);
  }

  const data = await res.json();
  const rows = data?.StatisticSearch?.row;
  if (!rows) return [];

  return rows.map((r: { TIME: string; DATA_VALUE: string }) => ({
    date: r.TIME,
    value: parseFloat(r.DATA_VALUE),
  })).filter((d: ECOSDataPoint) => !isNaN(d.value));
}

/** 주요 ECOS 통계표 코드 */
export const ECOS_CODES = {
  기준금리: { statCode: "722Y001", itemCode1: "0101000" },
  원달러환율: { statCode: "731Y003", itemCode1: "0000001" },
  소비자물가: { statCode: "021Y126", itemCode1: "0" },
  산업생산지수: { statCode: "901Y033", itemCode1: "I11AA" },
  수출금액: { statCode: "403Y003", itemCode1: "0000" },
  수입금액: { statCode: "403Y003", itemCode1: "0001" },
  실업률: { statCode: "901Y027", itemCode1: "3124" },
  GDP성장률: { statCode: "200Y002", itemCode1: "10111" },
} as const;

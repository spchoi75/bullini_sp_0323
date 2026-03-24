/**
 * KITA (한국무역협회) 수출입 통계 API
 * 품목별, 국가별 월별 수출입 데이터
 */

const KITA_API_KEY = process.env.KITA_API_KEY;

export interface KITATradeData {
  date: string;
  exportAmount: number; // 수출금액 (천달러)
  importAmount: number; // 수입금액 (천달러)
}

export async function getKITATrade(
  hsCode: string, // HS 코드 (8542=반도체, 8471=컴퓨터)
  countryCode?: string, // CN=중국, US=미국, JP=일본 (없으면 전체)
  startDate: string = "202001",
  endDate: string = "202612"
): Promise<KITATradeData[]> {
  if (!KITA_API_KEY) throw new Error("KITA_API_KEY not configured — 한국무역협회 API 키가 필요합니다. https://stat.kita.net/openApi/apiList.do 에서 발급하세요.");

  const params = new URLSearchParams({
    apiKey: KITA_API_KEY,
    type: "json",
    hscode: hsCode,
    startDt: startDate,
    endDt: endDate,
  });
  if (countryCode) params.set("countryCode", countryCode);

  const res = await fetch(
    `https://stat.kita.net/api/trade/getItemMonthlyData?${params}`
  );

  if (!res.ok) {
    throw new Error(`KITA API error ${res.status}`);
  }

  const data = await res.json();
  return (data.data ?? []).map(
    (d: { ym: string; expAmt: string; impAmt: string }) => ({
      date: d.ym,
      exportAmount: parseFloat(d.expAmt),
      importAmount: parseFloat(d.impAmt),
    })
  );
}

/** 주요 HS 코드 */
export const KITA_HS_CODES = {
  반도체: "8542",
  메모리반도체: "854232",
  디스플레이: "9013",
  컴퓨터: "8471",
  자동차: "8703",
  배터리: "8507",
  석유제품: "2710",
  철강: "7208",
} as const;

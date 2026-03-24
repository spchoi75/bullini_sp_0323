const DART_API_KEY = process.env.DART_API_KEY;

export interface DartFinancial {
  rcept_no: string;
  bsns_year: string;
  corp_code: string;
  account_nm: string;
  thstrm_amount: string;
  frmtrm_amount: string;
}

export async function getDartFinancials(
  corpCode: string,
  bsnsYear: string,
  reprtCode: string = "11011", // 사업보고서
  fsDiv: string = "CFS" // CFS=연결, OFS=별도
): Promise<DartFinancial[]> {
  if (!DART_API_KEY) throw new Error("DART_API_KEY not configured");

  const params = new URLSearchParams({
    crtfc_key: DART_API_KEY,
    corp_code: corpCode,
    bsns_year: bsnsYear,
    reprt_code: reprtCode,
    fs_div: fsDiv,
  });

  const res = await fetch(
    `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json?${params}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DART API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.status !== "000") {
    throw new Error(`DART API: ${data.message ?? "Unknown error"}`);
  }
  return data.list ?? [];
}

export async function searchDartCorp(corpName: string) {
  if (!DART_API_KEY) throw new Error("DART_API_KEY not configured");

  // DART corpCode lookup requires the XML file download
  // For now, use a simplified approach via the company list API
  const res = await fetch(
    `https://opendart.fss.or.kr/api/company.json?crtfc_key=${DART_API_KEY}&corp_name=${encodeURIComponent(corpName)}`
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DART search error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data;
}

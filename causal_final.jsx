import { useState, useMemo, useCallback, useEffect } from "react";

const C = {
  bg: "#0f1115", panel: "#12151b", card: "#181c24", border: "#242936",
  text: "#cdd0d8", soft: "#a0a4b0", dim: "#5e6274", accent: "#5eaba2",
  green: "#6fcf97", yellow: "#f2c94c", red: "#eb5757"
};

const CC = ["#7eb8d0", "#5eaba2", "#9b8ec4", "#d4726a", "#d4975a", "#6aad82"];
const CL = ["AI 빅테크 CAPEX", "HBM 기술 경쟁력", "경쟁사 증설 동향", "중국 반도체 추격", "밸류체인 병목", "무역·관세 정책"];

const NW = 82, NH = 36, ROW_H = 82, COL_W = 155, PAD_L = 140, PAD_T = 30;
const FX = PAD_L + 4 * COL_W + 60;
const FYC = PAD_T + 2.5 * ROW_H + NH / 2;
const FW = 90, FH = 48;

const INIT_CHAINS = [
  {
    nodes: [
      { id: "c0n0", label: "빅테크 AI\nCAPEX 확대", type: "event" },
      { id: "c0n1", label: "AI서버·GPU\n수요 증가", type: "numeric" },
      { id: "c0n2", label: "HBM·DDR5\n수주량", type: "numeric" },
    ],
    edges: [
      {
        id: "c0e0", from: 0, to: 1, edgeType: "event-numeric",
        proposition: "빅테크 4사 합산 2025년 CAPEX $3,200억(전년 대비 +30%), AI 서버 수요 급증",
        params: { delta: 30 }, timeLag: 0.25, confidence: "high",
        rationale: "골드만삭스 추정 2025년 MS·메타·구글·아마존 합산 CAPEX 약 $2,700억. 2026년에는 $4,700억~$6,700억으로 확대 전망. Δ=30%는 2024→2025 증가율 기준",
        sources: [
          { label: "골드만삭스 — 빅테크 올해 AI 투자 전망", url: "https://thecore.media/bigtekeuyi-olhae-ai-tuja-jeonmang-goldeumansagseu/" },
          { label: "경향신문 — 빅테크 4사 AI 966조원 투자 (2026.02)", url: "https://www.khan.co.kr/article/202602082114025" },
        ]
      },
      {
        id: "c0e1", from: 1, to: 2, edgeType: "numeric-numeric",
        proposition: "AI 서버 수요 증가 → HBM·DDR5 수주량 증가 (GPU당 HBM 탑재량 2.4배 증가)",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "high",
        rationale: "GPU당 HBM 탑재량이 H100(80GB)→B200(192GB)으로 2.4배 증가. β/r/p는 서버 출하량과 HBM 수주량 데이터로 직접 회귀분석 필요. 예상 범위: β 1.5~2.5",
        sources: [
          { label: "TrendForce — CXMT DDR5 Yield 80% 보고 (2024.12)", url: "https://www.trendforce.com/news/2024/12/30/news-chinese-dram-giant-cxmt-reportedly-achieves-80-ddr5-yield-targeting-90-by-2025/" },
          { label: "SK하이닉스 뉴스룸 — 2026년 시장 전망", url: "https://news.skhynix.co.kr/2026-market-outlook/" },
        ]
      },
      {
        id: "c0e2", from: 2, to: "final", edgeType: "numeric-numeric",
        proposition: "HBM·DDR5 수주량 변동 → 한국 반도체 주가지수 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.5, confidence: "medium",
        rationale: "HBM이 SK하이닉스 영업이익의 50% 이상 차지. β/r/p는 HBM 수주 공시 데이터와 KOSPI 반도체지수 간 회귀분석 필요. 예상 범위: β 0.4~0.8",
        sources: [
          { label: "글로벌이코노믹 — SK하이닉스·삼성 250조 잭팟 (2026.01)", url: "https://www.g-enews.com/article/Global-Biz/2026/01/202601201808373567fbbec65dfb_1" },
        ]
      },
    ]
  },
  {
    nodes: [
      { id: "c1n0", label: "HBM4\n양산 일정", type: "event" },
      { id: "c1n1", label: "HBM\n시장점유율", type: "numeric" },
      { id: "c1n2", label: "SK하이닉스\nHBM 매출", type: "numeric" },
    ],
    edges: [
      {
        id: "c1e0", from: 0, to: 1, edgeType: "event-numeric",
        proposition: "2026년 HBM4 양산 본격화 시 SK하이닉스 점유율 50%대 유지 vs 삼성 28%로 상승 전망",
        params: { delta: null }, timeLag: 0.5, confidence: "medium",
        rationale: "2025 Q2 HBM 점유율: SK하이닉스 62%, 마이크론 21%, 삼성 17% (카운터포인트). 2026년 HBM4에서 삼성 28%, SK하이닉스 50% 전망. Δ는 점유율 변동폭(%p)으로 직접 설정 필요",
        sources: [
          { label: "카운터포인트 인용 — SK하이닉스 HBM 62% (뉴스스페이스)", url: "https://www.newsspace.kr/news/article.html?no=11824" },
          { label: "트렌드포스 — 2026년 HBM 점유율 전망 (테크M)", url: "https://www.techm.kr/news/articleView.html?idxno=149519" },
        ]
      },
      {
        id: "c1e1", from: 1, to: 2, edgeType: "numeric-numeric",
        proposition: "HBM 점유율 변동 → SK하이닉스 HBM 매출 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "high",
        rationale: "2025년 HBM 시장 약 $380억, 2026년 $580억 전망. 점유율 1%p 당 약 $5.8억. β/r/p는 분기별 점유율-매출 데이터로 회귀분석 필요",
        sources: [
          { label: "Introl — HBM 진화 HBM3에서 HBM4까지", url: "https://introl.com/ko/blog/hbm-evolution-hbm3-hbm3e-hbm4-memory-ai-gpu-2025" },
        ]
      },
      {
        id: "c1e2", from: 2, to: "final", edgeType: "numeric-numeric",
        proposition: "SK하이닉스 HBM 매출 변동 → 한국 반도체 주가지수 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "medium",
        rationale: "SK하이닉스 KOSPI 반도체 지수 비중 약 35%. 2025 Q3 영업이익률 47%. β/r/p는 실적 발표일 전후 주가 이벤트스터디로 추정 가능. 예상 범위: β 0.3~0.6",
        sources: [
          { label: "글로벌이코노믹 — 삼성·SK하이닉스 70조 투자전쟁", url: "https://www.g-enews.com/article/Global-Biz/2026/01/202601011740189328fbbec65dfb_1" },
        ]
      },
    ]
  },
  {
    nodes: [
      { id: "c2n0", label: "마이크론·키옥시아\n증설", type: "event" },
      { id: "c2n1", label: "DRAM·NAND\n글로벌 공급", type: "numeric" },
      { id: "c2n2", label: "메모리\nASP", type: "numeric" },
    ],
    edges: [
      {
        id: "c2e0", from: 0, to: 1, edgeType: "event-numeric",
        proposition: "마이크론 아이다호+싱가포르 $240억 팹, 키옥시아-WD 합병 후 투자 재개",
        params: { delta: null }, timeLag: 0.75, confidence: "medium",
        rationale: "마이크론 싱가포르 $240억 메가팹 건설 발표. 정확한 글로벌 공급 증가율(Δ%)은 Omdia/TrendForce bit growth 전망치 참조 필요. 연간 DRAM bit growth 일반적 범위 15~25%",
        sources: [
          { label: "Micron Investor Relations", url: "https://investors.micron.com" },
        ]
      },
      {
        id: "c2e1", from: 1, to: 2, edgeType: "numeric-numeric",
        proposition: "DRAM 공급 과잉/부족 → 메모리 ASP 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "high",
        rationale: "역사적으로 DRAM 공급 1%p 과잉 시 ASP 3~5% 하락 (2023년 공급과잉 5% → ASP -15~20%). β/r/p는 DRAMeXchange 분기별 가격-공급 데이터로 회귀분석 필요",
        sources: [
          { label: "BofA 인용 — 2026년 D램 ASP 33% 상승 전망 (SK하이닉스 뉴스룸)", url: "https://news.skhynix.co.kr/2026-market-outlook/" },
        ]
      },
      {
        id: "c2e2", from: 2, to: "final", edgeType: "numeric-numeric",
        proposition: "메모리 ASP 변동 → 한국 반도체 주가지수 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "high",
        rationale: "삼성+SK하이닉스 메모리 매출이 KOSPI 반도체 지수의 약 85%. ASP→영업이익 레버리지 효과. 예상 범위: β 0.8~1.5",
        sources: [
          { label: "비즈니스포스트 — SK하이닉스·삼성 2026 실적 경주", url: "https://www.businesspost.co.kr/BP?command=article_view&num=424960" },
        ]
      },
    ]
  },
  {
    nodes: [
      { id: "c3n0", label: "CXMT 레거시\nDRAM 양산", type: "event" },
      { id: "c3n1", label: "레거시 DRAM\n가격", type: "numeric" },
      { id: "c3n2", label: "삼성 범용\n메모리 매출", type: "numeric" },
    ],
    edges: [
      {
        id: "c3e0", from: 0, to: 1, edgeType: "event-numeric",
        proposition: "CXMT 월 20만장(2025Q1) → 30만장(2026) 증산, 글로벌 DRAM 6%→10% 점유",
        params: { delta: null }, timeLag: 0.5, confidence: "medium",
        rationale: "CXMT 2025 Q1 월 20만장 생산, 2026년 30만장 전망 (DigiTimes). DRAM 점유율 Q1 6% → Q4 8% 전망 (카운터포인트). 레거시 가격 하락폭(Δ%)은 DDR4 스팟가격 추이로 직접 확인 필요",
        sources: [
          { label: "DigiTimes — CXMT DRAM 톱티어 진입 (2025.04)", url: "https://www.digitimes.com/news/a20250421PD218/cxmt-dram-samsung-sk-hynix-2025.html" },
          { label: "BusinessKorea — CXMT DRAM 50% 증산 (2025.06)", url: "https://www.businesskorea.co.kr/news/articleView.html?idxno=245158" },
          { label: "Wikipedia — ChangXin Memory Technologies", url: "https://en.wikipedia.org/wiki/ChangXin_Memory_Technologies" },
          { label: "TrendForce — CXMT DDR5 80% 수율 달성 (2024.12)", url: "https://www.trendforce.com/news/2024/12/30/news-chinese-dram-giant-cxmt-reportedly-achieves-80-ddr5-yield-targeting-90-by-2025/" },
        ]
      },
      {
        id: "c3e1", from: 1, to: 2, edgeType: "numeric-numeric",
        proposition: "레거시 DRAM 가격 하락 → 삼성 범용 메모리 매출 감소",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "medium",
        rationale: "삼성 범용 DRAM(DDR4/LPDDR4) 비중 축소 중이나 아직 상당. 단 CXMT는 DDR4 감산하고 DDR5로 전환 중. β/r/p는 DDR4 스팟가와 삼성 DS부문 매출로 회귀분석 필요",
        sources: [
          { label: "ICGOODFIND — CXMT DDR4 감산, DDR5 전환 (2025.12)", url: "https://www.icgoodfind.com/cms/Article/get/article_id/16657" },
        ]
      },
      {
        id: "c3e2", from: 2, to: "final", edgeType: "numeric-numeric",
        proposition: "삼성 범용 매출 변동 → 한국 반도체 주가지수 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "low",
        rationale: "삼성 지수 비중 약 50%이나 시장은 HBM 프리미엄에 더 주목. 범용 매출 영향 제한적. 예상 범위: β 0.2~0.5",
        sources: [
          { label: "비즈니스포스트 — 삼성·SK하이닉스 실적 경주 (2025.12)", url: "https://www.businesspost.co.kr/BP?command=article_view&num=424960" },
        ]
      },
    ]
  },
  {
    nodes: [
      { id: "c4n0", label: "TSMC CoWoS\nCAPA 부족", type: "event" },
      { id: "c4n1", label: "AI칩 출하\n병목", type: "numeric" },
      { id: "c4n2", label: "HBM 실수요\n지연", type: "numeric" },
    ],
    edges: [
      {
        id: "c4e0", from: 0, to: 1, edgeType: "event-numeric",
        proposition: "TSMC CoWoS CAPA가 B200/Rubin 수요를 감당 못해 AI칩 출하 지연",
        params: { delta: null }, timeLag: 0.25, confidence: "medium",
        rationale: "TSMC CoWoS 월 4만장 수준이나 수요 초과 상태 지속. 출하 지연률(Δ%)은 TSMC 분기 어닝콜 가이던스와 NVIDIA 출하 데이터 대조 필요",
        sources: [
          { label: "TSMC Investor Relations", url: "https://www.tsmc.com/english/investors" },
        ]
      },
      {
        id: "c4e1", from: 1, to: 2, edgeType: "numeric-numeric",
        proposition: "AI칩 출하 지연 → HBM 실수요 지연 (HBM은 GPU에 직접 탑재)",
        params: { beta: null, r: null, p: null }, timeLag: 0, confidence: "high",
        rationale: "HBM은 GPU 패키지에 직접 탑재. AI칩 출하 = HBM 출하. 거의 1:1이나 재고 버퍼 존재. 예상 β 범위: 0.85~0.95",
        sources: [
          { label: "SK하이닉스 뉴스룸 — 2026년 시장 전망", url: "https://news.skhynix.co.kr/2026-market-outlook/" },
        ]
      },
      {
        id: "c4e2", from: 2, to: "final", edgeType: "numeric-numeric",
        proposition: "HBM 실수요 지연 → 한국 반도체 주가지수 하락 (단기 실적 미스)",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "medium",
        rationale: "출하 지연은 단기 실적 미스이나 이연 수요로 장기 영향 제한. 과거 CoWoS 이슈 시 지수 반응으로 이벤트스터디 가능. 예상 β: 0.3~0.6",
        sources: [
          { label: "SK하이닉스 뉴스룸 — 2026년 시장 전망", url: "https://news.skhynix.co.kr/2026-market-outlook/" },
        ]
      },
    ]
  },
  {
    nodes: [
      { id: "c5n0", label: "트럼프\n상호관세", type: "event" },
      { id: "c5n1", label: "대중 반도체\n수출규제", type: "event" },
      { id: "c5n2", label: "한국 대중\n반도체 수출", type: "numeric" },
    ],
    edges: [
      {
        id: "c5e0", from: 0, to: 1, edgeType: "event-event",
        proposition: "트럼프 상호관세 체제에서 대중 반도체 수출규제 추가 강화 가능성",
        params: { probability: null }, timeLag: 0.5, confidence: "medium",
        rationale: "2025.4 상호관세 이후 반도체 일시 제외, 대중 기술 견제 기조 지속. 확률(P)은 전문가 설문 또는 정책 시나리오 분석 필요. 일반적 범위: 0.4~0.7",
        sources: [
          { label: "BIS — Export Administration Regulations", url: "https://www.bis.doc.gov" },
          { label: "CSIS — Strategic Technologies Program", url: "https://www.csis.org/programs/strategic-technologies-program" },
        ]
      },
      {
        id: "c5e1", from: 1, to: 2, edgeType: "event-numeric",
        proposition: "대중 수출규제 강화 시 한국 대중 반도체 수출 감소",
        params: { delta: null }, timeLag: 0.5, confidence: "low",
        rationale: "한국 반도체 수출의 약 40%가 중국향. HBM은 대부분 미국향이라 범용 메모리에 집중. Δ는 과거 규제 강화 시점(2022.10, 2023.10)의 수출 통계 변화로 추정 가능",
        sources: [
          { label: "한국무역협회 수출입통계 (KITA)", url: "https://stat.kita.net" },
          { label: "산업통상자원부 수출동향", url: "https://www.motie.go.kr" },
        ]
      },
      {
        id: "c5e2", from: 2, to: "final", edgeType: "numeric-numeric",
        proposition: "한국 대중 반도체 수출 변동 → 한국 반도체 주가지수 변동",
        params: { beta: null, r: null, p: null }, timeLag: 0.25, confidence: "medium",
        rationale: "수출→매출→실적 채널이나 비중국 AI 수요 대체가 하락폭 제한. β/r/p는 월별 대중 수출액과 KOSPI 반도체지수 간 회귀분석 필요. 예상 범위: β 0.2~0.5",
        sources: [
          { label: "한국무역협회 수출입통계 (KITA)", url: "https://stat.kita.net" },
        ]
      },
    ]
  },
];

function calcImpact(chain) {
  let v = null;
  let t = 0;
  for (const e of chain.edges) {
    t += e.timeLag || 0;
    if (e.edgeType === "event-numeric" && e.params.delta != null) {
      v = e.params.delta;
    } else if (e.edgeType === "numeric-numeric" && e.params.beta != null && v != null) {
      v = Math.round(v * e.params.beta * 1000) / 1000;
    }
  }
  return { final: v, totalTime: t };
}

function confCol(c) {
  if (c === "high") return C.green;
  if (c === "medium") return C.yellow;
  return C.red;
}

function edgeTypeName(t) {
  const m = { "event-numeric": "이벤트→수치", "numeric-numeric": "수치→수치", "event-event": "이벤트→이벤트" };
  return m[t] || t;
}

function hasNullParams(params) {
  return Object.values(params).some(v => v === null);
}

function getParamTexts(edge) {
  const p = edge.params;
  let top = "", bot = "";
  if (edge.edgeType === "event-numeric") {
    top = p.delta != null ? ("Δ=" + (p.delta > 0 ? "+" : "") + p.delta + "%") : "Δ=?";
  } else if (edge.edgeType === "numeric-numeric") {
    top = p.beta != null ? ("β=" + p.beta) : "β=?";
    bot = p.r != null ? ("r=" + p.r) : "r=?";
  } else if (edge.edgeType === "event-event") {
    top = p.probability != null ? ("P=" + (p.probability * 100).toFixed(0) + "%") : "P=?";
  }
  let pText = "";
  if (edge.edgeType === "numeric-numeric") {
    pText = p.p != null ? ("p=" + (p.p < 0.001 ? p.p.toExponential(0) : p.p)) : "p=?";
  }
  return { top, bot, pText };
}

function SNode({ x, y, label, type, color, hov, onClick, onEnter, onLeave }) {
  const isEv = type === "event";
  const lines = label.split("\n");
  return (
    <g onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ cursor: "pointer" }}>
      <rect x={x - NW / 2} y={y - NH / 2} width={NW} height={NH}
        fill={isEv ? color + "10" : C.card}
        stroke={hov ? color : color + "40"} strokeWidth={hov ? 1.4 : 0.7} />
      {lines.map((l, i) => (
        <text key={i} x={x} y={y + (i - (lines.length - 1) / 2) * 11}
          textAnchor="middle" dominantBaseline="central" fill={C.soft}
          fontSize={8.5} fontWeight={500} fontFamily="'Noto Sans KR',sans-serif"
          style={{ pointerEvents: "none" }}>{l}</text>
      ))}
    </g>
  );
}

function SEdge({ sx, sy, ex, ey, edge, color, hov, sel, onEnter, onLeave, onClick, converge }) {
  const active = hov || sel;
  const stroke = active ? color : color + "50";
  const isNull = hasNullParams(edge.params);
  const { top, bot, pText } = getParamTexts(edge);

  let path;
  if (converge) {
    const cpx = sx + (ex - sx) * 0.65;
    path = "M" + sx + "," + sy + " C" + cpx + "," + sy + " " + (ex - 30) + "," + ey + " " + ex + "," + ey;
  } else {
    path = "M" + sx + "," + sy + " L" + ex + "," + ey;
  }

  const lx = converge ? sx + (ex - sx) * 0.35 : (sx + ex) / 2;
  const ly = converge ? sy + (ey - sy) * 0.35 : sy;

  return (
    <g onMouseEnter={() => onEnter(edge.id)} onMouseLeave={onLeave} onClick={() => onClick(edge.id)} style={{ cursor: "pointer" }}>
      <path d={path} fill="none" stroke="transparent" strokeWidth={16} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={active ? 1.5 : 0.8}
        markerEnd={"url(#a-" + (active ? "h" : "l") + ")"}
        strokeDasharray={isNull ? "4,3" : "none"} />
      <text x={lx} y={ly - 10} textAnchor="middle" dominantBaseline="central"
        fill={isNull ? (active ? "#f2c94c" : "#8a7a50") : (active ? color : "#7a7e8c")}
        fontSize={8} fontWeight={600} fontFamily="'JetBrains Mono',monospace"
        style={{ pointerEvents: "none" }}>
        {top}{pText ? ("  " + pText) : ""}
      </text>
      {bot && (
        <text x={lx} y={ly + 10} textAnchor="middle" dominantBaseline="central"
          fill={isNull ? "#6a6040" : "#5a5e6c"} fontSize={7.5} fontWeight={500}
          fontFamily="'JetBrains Mono',monospace" style={{ pointerEvents: "none" }}>
          {bot}
        </text>
      )}
      <circle cx={lx + 30} cy={ly - 10} r={2.2} fill={confCol(edge.confidence)}
        opacity={active ? 0.8 : 0.4} style={{ pointerEvents: "none" }} />
    </g>
  );
}

function Detail({ edge, ci, onClose, onUpdate }) {
  if (!edge) return null;
  const color = ci >= 0 ? CC[ci] : C.accent;
  const [editing, setEditing] = useState(false);
  const [ep, setEp] = useState({ ...edge.params });
  const isNull = hasNullParams(edge.params);

  useEffect(() => {
    setEp({ ...edge.params });
    setEditing(false);
  }, [edge.id]);

  let pf = [];
  if (edge.edgeType === "event-numeric") {
    pf = [{ k: "delta", l: "Δ 변화량 %", s: 0.1 }];
  } else if (edge.edgeType === "numeric-numeric") {
    pf = [{ k: "beta", l: "β 기울기", s: 0.01 }, { k: "r", l: "r 상관계수", s: 0.01 }, { k: "p", l: "p-value", s: 0.001 }];
  } else if (edge.edgeType === "event-event") {
    pf = [{ k: "probability", l: "P 발생확률", s: 0.01 }];
  }

  function handleSave() {
    onUpdate(edge.id, ep);
    setEditing(false);
  }

  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, padding: 18, borderLeft: "3px solid " + color }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ background: color + "18", color: color, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{edgeTypeName(edge.edgeType)}</span>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: confCol(edge.confidence), display: "inline-block" }} />
          <span style={{ color: C.dim, fontSize: 10 }}>{edge.confidence}</span>
          {edge.timeLag != null && <span style={{ color: C.dim, fontSize: 10 }}>T+{edge.timeLag}yr</span>}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: 0 }}>✕</button>
      </div>

      <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.6 }}>{edge.proposition}</div>

      {isNull && (
        <div style={{ background: "#f2c94c12", border: "1px solid #f2c94c30", padding: "8px 10px", marginTop: 8, marginBottom: 4 }}>
          <div style={{ color: C.yellow, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>파라미터 미입력</div>
          <div style={{ color: "#b0a060", fontSize: 11, lineHeight: 1.6 }}>아래 추정 근거의 안내에 따라 직접 분석 후 값을 입력해 주세요.</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "12px 0" }}>
        {pf.map(({ k, l, s }) => (
          <div key={k} style={{ flex: "1 1 80px", background: "#0e1018", padding: "8px 10px", border: "1px solid " + (edge.params[k] == null ? "#f2c94c30" : C.border) }}>
            <div style={{ color: C.dim, fontSize: 9, marginBottom: 2, letterSpacing: 0.4 }}>{l}</div>
            {editing ? (
              <input type="number" step={s} value={ep[k] != null ? ep[k] : ""} placeholder="입력"
                onChange={e => {
                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                  setEp(prev => ({ ...prev, [k]: val }));
                }}
                style={{ background: "#181c28", border: "1px solid " + color + "50", color: color, padding: "2px 4px", width: "100%", fontSize: 16, fontFamily: "'JetBrains Mono',monospace", outline: "none" }} />
            ) : (
              <div style={{ color: edge.params[k] != null ? C.text : C.yellow, fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                {edge.params[k] != null ? (k === "p" ? edge.params[k].toExponential(1) : edge.params[k]) : "—"}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ background: "#0e1018", padding: "10px 12px", marginBottom: 8, border: "1px solid " + C.border }}>
        <div style={{ color: C.dim, fontSize: 9, marginBottom: 4, letterSpacing: 0.4 }}>추정 근거 및 분석 가이드</div>
        <div style={{ color: "#a8aab2", fontSize: 13, lineHeight: 1.7 }}>{edge.rationale}</div>
      </div>

      {edge.sources && edge.sources.length > 0 && (
        <div style={{ background: "#0e1018", padding: "10px 12px", marginBottom: 10, border: "1px solid " + C.border }}>
          <div style={{ color: C.dim, fontSize: 9, marginBottom: 5, letterSpacing: 0.4 }}>근거 자료</div>
          {edge.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", color: color, fontSize: 12, marginBottom: 5, textDecoration: "none", lineHeight: 1.5 }}>
              {"↗ " + s.label}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6 }}>
        {editing ? (
          <>
            <button onClick={handleSave} style={{ flex: 1, background: color, color: "#000", border: "none", padding: "8px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>저장</button>
            <button onClick={() => { setEditing(false); setEp({ ...edge.params }); }} style={{ flex: 1, background: "transparent", color: C.dim, border: "1px solid " + C.border, padding: "8px", fontSize: 13, cursor: "pointer" }}>취소</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} style={{ flex: 1, background: isNull ? "#f2c94c18" : "transparent", color: isNull ? C.yellow : color, border: "1px solid " + (isNull ? C.yellow + "40" : color + "40"), padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            {isNull ? "파라미터 입력" : "파라미터 수정"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [selEdge, setSelEdge] = useState(null);
  const [hovEdge, setHovEdge] = useState(null);
  const [hovRow, setHovRow] = useState(-1);
  const [data, setData] = useState(INIT_CHAINS);

  const allEdges = useMemo(() => {
    const out = [];
    data.forEach((ch, ci) => ch.edges.forEach(e => out.push({ ...e, chainIdx: ci })));
    return out;
  }, [data]);

  const selObj = useMemo(() => allEdges.find(e => e.id === selEdge), [selEdge, allEdges]);

  const activeRow = useMemo(() => {
    const id = hovEdge || selEdge;
    if (id) {
      const e = allEdges.find(x => x.id === id);
      if (e) return e.chainIdx;
    }
    if (hovRow !== -1) return hovRow;
    return -1;
  }, [hovEdge, selEdge, allEdges, hovRow]);

  const impacts = useMemo(() => data.map(ch => calcImpact(ch)), [data]);

  const totalImpact = useMemo(() => {
    const vals = impacts.filter(v => v.final != null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, v) => a + v.final, 0) * 1000) / 1000;
  }, [impacts]);

  const nullCount = useMemo(() => {
    let c = 0;
    data.forEach(ch => ch.edges.forEach(e => {
      Object.values(e.params).forEach(v => { if (v === null) c++; });
    }));
    return c;
  }, [data]);

  const handleUpdate = useCallback((eid, np) => {
    setData(prev => prev.map(ch => ({
      ...ch,
      edges: ch.edges.map(e => e.id === eid ? { ...e, params: { ...e.params, ...np } } : e)
    })));
  }, []);

  const svgW = FX + FW / 2 + 40;
  const svgH = PAD_T + 6 * ROW_H + 20;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Noto Sans KR','Pretendard',sans-serif", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ padding: "10px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Bullini Causal Map</div>
        <span style={{ color: C.dim, fontSize: 10 }}>—</span>
        <div style={{ fontSize: 10, color: C.dim }}>한국 반도체 기업 주가지수 · 6축 인과 체인</div>
        {nullCount > 0 && (
          <div style={{ marginLeft: "auto", background: "#f2c94c12", border: "1px solid #f2c94c30", padding: "2px 10px", fontSize: 10, color: C.yellow }}>
            미입력 파라미터 {nullCount}개 — 점선 엣지 클릭 후 입력
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel */}
        <div style={{ width: 340, minWidth: 340, borderRight: "1px solid " + C.border, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, background: C.panel }}>
          <div style={{ background: C.card, padding: 14, border: "1px solid " + C.border }}>
            <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, marginBottom: 10, letterSpacing: 0.6 }}>체인별 최종 영향도</div>
            {CL.map((label, i) => {
              const imp = impacts[i];
              const dimmed = activeRow !== -1 && activeRow !== i;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", cursor: "pointer", opacity: dimmed ? 0.3 : 1, transition: "opacity 0.15s" }}
                  onClick={() => { const fe = data[i] && data[i].edges[0]; if (fe) setSelEdge(fe.id); }}
                  onMouseEnter={() => setHovRow(i)} onMouseLeave={() => setHovRow(-1)}>
                  <div style={{ width: 8, height: 8, background: CC[i], flexShrink: 0, opacity: 0.8 }} />
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 600, flex: 1 }}>{label}</span>
                  {imp.final != null ? (
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: imp.final > 0 ? C.green : imp.final < 0 ? C.red : C.dim }}>
                      {imp.final > 0 ? "+" : ""}{imp.final}%
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: C.yellow, fontFamily: "'JetBrains Mono',monospace" }}>입력 필요</span>
                  )}
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: "'JetBrains Mono',monospace" }}>{imp.totalTime}yr</span>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid " + C.border, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>합산 영향</span>
              {totalImpact != null ? (
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: totalImpact > 0 ? C.green : totalImpact < 0 ? C.red : C.dim }}>
                  {totalImpact > 0 ? "+" : ""}{totalImpact}%
                </span>
              ) : (
                <span style={{ fontSize: 11, color: C.yellow }}>파라미터 입력 후 산출</span>
              )}
            </div>
          </div>

          {selObj ? (
            <Detail edge={selObj} ci={selObj.chainIdx} onClose={() => setSelEdge(null)} onUpdate={handleUpdate} />
          ) : (
            <div style={{ background: C.card, padding: 20, border: "1px solid " + C.border, textAlign: "center" }}>
              <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.7 }}>엣지를 클릭하면<br />상세 파라미터와 근거 자료를<br />확인할 수 있습니다</div>
              <div style={{ color: C.yellow, fontSize: 11, marginTop: 8 }}>점선 = 미입력 파라미터</div>
            </div>
          )}

          <div style={{ background: C.card, padding: 12, border: "1px solid " + C.border }}>
            <div style={{ color: C.dim, fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 0.6 }}>범례</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 22, height: 14, background: C.accent + "10", border: "0.7px solid " + C.accent + "40" }} />
                <span style={{ color: C.dim }}>이벤트</span>
                <div style={{ width: 22, height: 14, background: C.card, border: "0.7px solid #6e728240", marginLeft: 8 }} />
                <span style={{ color: C.dim }}>수치</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.green, display: "inline-block" }} />
                <span style={{ color: C.dim, marginRight: 5 }}>high</span>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.yellow, display: "inline-block" }} />
                <span style={{ color: C.dim, marginRight: 5 }}>medium</span>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.red, display: "inline-block" }} />
                <span style={{ color: C.dim }}>low</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <svg width={30} height={8}><line x1={0} y1={4} x2={30} y2={4} stroke={C.dim} strokeWidth={1} /></svg>
                <span style={{ color: C.dim }}>확정값</span>
                <svg width={30} height={8}><line x1={0} y1={4} x2={30} y2={4} stroke={C.yellow} strokeWidth={1} strokeDasharray="4,3" /></svg>
                <span style={{ color: C.yellow }}>미입력</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div style={{ flex: 1, overflow: "auto", background: C.bg }}>
          <svg viewBox={"0 0 " + svgW + " " + svgH} style={{ width: "100%", height: "100%", minWidth: svgW, minHeight: svgH }}>
            <defs>
              <marker id="a-l" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4 Z" fill={C.dim} opacity={0.3} />
              </marker>
              <marker id="a-h" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4 Z" fill={C.accent} />
              </marker>
            </defs>

            {/* Row labels */}
            {CL.map((label, i) => {
              const y = PAD_T + i * ROW_H + NH / 2;
              const dimmed = activeRow !== -1 && activeRow !== i;
              return (
                <text key={"rl" + i} x={12} y={y} dominantBaseline="central" fill={CC[i]}
                  fontSize={8.5} fontWeight={600} fontFamily="'JetBrains Mono',monospace"
                  opacity={dimmed ? 0.15 : 0.65} style={{ transition: "opacity 0.15s" }}>
                  {label}
                </text>
              );
            })}

            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <line key={"gl" + i} x1={PAD_L - 20} y1={PAD_T + i * ROW_H - ROW_H / 2 + NH / 2}
                x2={svgW - 20} y2={PAD_T + i * ROW_H - ROW_H / 2 + NH / 2}
                stroke={C.border} strokeWidth={0.3} opacity={0.3} />
            ))}

            {/* Edges */}
            {data.map((ch, ci) => {
              const dimmed = activeRow !== -1 && activeRow !== ci;
              const rowY = PAD_T + ci * ROW_H + NH / 2;
              return (
                <g key={"eg" + ci} opacity={dimmed ? 0.08 : 1} style={{ transition: "opacity 0.15s" }}>
                  {ch.edges.map((edge) => {
                    const isF = edge.to === "final";
                    const sx = PAD_L + edge.from * COL_W + NW / 2;
                    const sy = rowY;
                    const ex = isF ? FX - FW / 2 : PAD_L + edge.to * COL_W - NW / 2;
                    const ey = isF ? FYC : rowY;
                    return (
                      <SEdge key={edge.id} sx={sx} sy={sy} ex={ex} ey={ey}
                        edge={edge} color={CC[ci]} converge={isF}
                        hov={hovEdge === edge.id} sel={selEdge === edge.id}
                        onEnter={setHovEdge} onLeave={() => setHovEdge(null)} onClick={setSelEdge} />
                    );
                  })}
                </g>
              );
            })}

            {/* Nodes */}
            {data.map((ch, ci) => {
              const dimmed = activeRow !== -1 && activeRow !== ci;
              const rowY = PAD_T + ci * ROW_H + NH / 2;
              return (
                <g key={"ng" + ci} opacity={dimmed ? 0.08 : 1} style={{ transition: "opacity 0.15s" }}>
                  {ch.nodes.map((node, ni) => {
                    const x = PAD_L + ni * COL_W;
                    return (
                      <SNode key={node.id} x={x} y={rowY} label={node.label} type={node.type}
                        color={CC[ci]} hov={activeRow === ci}
                        onClick={() => setSelEdge(ch.edges[Math.min(ni, ch.edges.length - 1)].id)}
                        onEnter={() => setHovRow(ci)} onLeave={() => setHovRow(-1)} />
                    );
                  })}
                  {impacts[ci].final != null && (
                    <text x={PAD_L + 2 * COL_W + NW / 2 + 16} y={rowY + NH / 2 + 10}
                      textAnchor="start" fill={impacts[ci].final > 0 ? C.green : impacts[ci].final < 0 ? C.red : C.dim}
                      fontSize={7.5} fontWeight={700} fontFamily="'JetBrains Mono',monospace" opacity={0.6}>
                      {"→ " + (impacts[ci].final > 0 ? "+" : "") + impacts[ci].final + "%"}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Time labels */}
            {data.map((ch, ci) => {
              const dimmed = activeRow !== -1 && activeRow !== ci;
              const rowY = PAD_T + ci * ROW_H + NH / 2;
              let cumT = 0;
              const times = [{ col: 0, t: "T=0", isFinal: false }];
              ch.edges.forEach((e) => {
                cumT += e.timeLag || 0;
                times.push({ col: e.to === "final" ? -1 : e.to, t: "T=" + cumT, isFinal: e.to === "final" });
              });
              return (
                <g key={"tg" + ci} opacity={dimmed ? 0.04 : 0.35} style={{ transition: "opacity 0.15s" }}>
                  {times.map((tm, ti) => {
                    const x = tm.isFinal ? FX - FW / 2 - 8 : PAD_L + tm.col * COL_W;
                    return (
                      <text key={ti} x={x} y={rowY - NH / 2 - 5} textAnchor="middle" dominantBaseline="central"
                        fill={C.dim} fontSize={6.5} fontFamily="'JetBrains Mono',monospace">
                        {tm.t}
                      </text>
                    );
                  })}
                </g>
              );
            })}

            {/* Final node */}
            <rect x={FX - FW / 2} y={FYC - FH / 2} width={FW} height={FH}
              fill={C.card} stroke={C.accent + "60"} strokeWidth={1.2} />
            <text x={FX} y={FYC - 8} textAnchor="middle" dominantBaseline="central"
              fill={C.accent} fontSize={9} fontWeight={700} fontFamily="'Noto Sans KR',sans-serif">한국 반도체</text>
            <text x={FX} y={FYC + 5} textAnchor="middle" dominantBaseline="central"
              fill={C.soft} fontSize={8.5} fontWeight={600} fontFamily="'Noto Sans KR',sans-serif">기업 주가지수</text>
            {totalImpact != null ? (
              <text x={FX} y={FYC + FH / 2 + 14} textAnchor="middle" dominantBaseline="central"
                fill={totalImpact > 0 ? C.green : totalImpact < 0 ? C.red : C.dim}
                fontSize={11} fontWeight={800} fontFamily="'JetBrains Mono',monospace">
                {(totalImpact > 0 ? "+" : "") + totalImpact + "%"}
              </text>
            ) : (
              <text x={FX} y={FYC + FH / 2 + 14} textAnchor="middle" dominantBaseline="central"
                fill={C.yellow} fontSize={9} fontFamily="'JetBrains Mono',monospace">
                파라미터 입력 필요
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

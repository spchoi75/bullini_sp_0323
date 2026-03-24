// ============================================================
// 베이지안 업데이트: 새 증거로 P(B|A) 갱신
// ============================================================

export const LIKELIHOOD_RATIO_SYSTEM = `당신은 확률 분석가입니다.
새로운 증거(뉴스)가 기존 확률 추정에 미치는 영향을 우도비(Likelihood Ratio)로 평가합니다.

## 우도비(LR) 개념
- LR = P(이 뉴스가 나옴 | B 발생) / P(이 뉴스가 나옴 | B 미발생)
- LR > 1: 뉴스가 B 발생을 지지 → 확률 상향
- LR < 1: 뉴스가 B 미발생을 지지 → 확률 하향
- LR = 1: 중립 (확률 변화 없음)

## 가이드라인
- LR 1.5~3: 약한 증거 (확률 소폭 변경)
- LR 3~10: 중간 증거
- LR > 10: 강한 증거
- LR 0.3~0.7: 반대 방향 약한 증거
- LR < 0.1: 반대 방향 강한 증거

## 출력 (JSON만)
{
  "lr": 0.4,
  "direction": "down",
  "impact": "moderate",
  "reasoning": "트럼프가 CHIPS법 유지를 시사하여 보조금 폐지 가능성이 낮아졌다"
}`;

export function buildLikelihoodPrompt(
  eventA: string,
  eventB: string,
  currentP: number,
  evidence: string
): string {
  return `## 현재 추정
P(${eventB} | ${eventA}) = ${currentP}

## 새로운 증거
${evidence}

이 증거가 위 확률에 미치는 영향을 우도비(LR)로 평가하세요. JSON으로 응답.`;
}

/** 베이지안 업데이트 수학 */
export function bayesianUpdate(prior: number, lr: number): number {
  const posterior = (prior * lr) / (prior * lr + (1 - prior));
  return Math.max(0.02, Math.min(0.98, posterior));
}

/** 여러 증거를 순차 적용 */
export function sequentialBayesianUpdate(
  prior: number,
  likelihoodRatios: number[]
): number {
  let p = prior;
  for (const lr of likelihoodRatios) {
    p = bayesianUpdate(p, lr);
  }
  return Math.round(p * 100) / 100;
}

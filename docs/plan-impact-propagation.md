# 영향도 전파 & 합산 엔진 고도화 계획

## 1. 단일 체인 전파 규칙

| 엣지 타입 | 입력 | 공식 | 출력 |
|-----------|------|------|------|
| Numeric→Numeric | ΔX | ΔX × β | 타겟 변화량 |
| Event→Numeric | P_src | P_src × Δ | 기대 변화율 (%) |
| Event→Event | P_src | P_src × P(B\|A) | 후행 이벤트 확률 |
| Numeric→Event | ΔX | sigmoid(ΔX, θ, k) | 이벤트 확률 |

핵심: 이벤트→확률, 수치→변화량. 최종 타겟은 "확률 가중 기대 변화율(%)".

## 2. 가중 합산
```
Total = Σ(w_i × impact_i) / Σ(w_i)
w_i = confidence × (1 - p_value) × completeness
```

## 3. Null 체인: pending 엣지 있으면 제외 + "정량화 불가" 표시
## 4. Monte Carlo: 10,000회 시뮬레이션 → 95% CI
## 5. 시간 필터: 6개월 / 1년 / 전체
## 6. 실시간 UI: 파라미터 변경 → 즉시 재계산 → FinalNode에 표시

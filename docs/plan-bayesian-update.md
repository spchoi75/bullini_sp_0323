# 베이지안 업데이트 설계 (후순위)

## 개요
Event→Event 엣지의 P(B|A)를 새 뉴스/증거에 따라 갱신하는 기능.

## 공식
P(B|A, evidence) = P(evidence|B,A) · P(B|A) / P(evidence|A)

## 트리거: 수동 ("뉴스로 업데이트" 버튼)
1. Tavily 최근 뉴스 검색 또는 사용자 직접 입력
2. Haiku가 각 뉴스의 우도비(LR) 추정
3. 순차 베이지안 업데이트: P_new = (P_old × LR) / (P_old × LR + 1 - P_old)
4. 변화 >15%p → 사용자 확인 요청

## 구현 파일 (예정)
- `lib/prompts/bayesian-update.ts`
- `app/api/params/bayesian-update/route.ts`
- EdgeDetail에 "뉴스로 업데이트" 버튼

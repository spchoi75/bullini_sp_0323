"""Bullini Causal Map — Python 통계 계산 서버"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import numeric_to_numeric, event_study, numeric_to_event, propagation, data_sources

app = FastAPI(
    title="Bullini Stats Server",
    description="인과 그래프 파라미터 통계 계산 서버",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(numeric_to_numeric.router, prefix="/compute", tags=["numeric-to-numeric"])
app.include_router(event_study.router, prefix="/compute", tags=["event-study"])
app.include_router(numeric_to_event.router, prefix="/compute", tags=["numeric-to-event"])
app.include_router(propagation.router, prefix="/compute", tags=["propagation"])
app.include_router(data_sources.router, prefix="/data", tags=["data-sources"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "bullini-stats"}

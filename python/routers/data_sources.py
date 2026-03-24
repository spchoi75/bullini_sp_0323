"""외부 데이터 소스 엔드포인트 — Yahoo Finance, World Bank 등"""

from fastapi import APIRouter
from pydantic import BaseModel
import yfinance as yf

router = APIRouter()


class YahooRequest(BaseModel):
    symbol: str
    period: str = "5y"
    interval: str = "1d"


@router.post("/yahoo-finance")
async def get_yahoo_data(req: YahooRequest):
    try:
        ticker = yf.Ticker(req.symbol)
        hist = ticker.history(period=req.period, interval=req.interval)

        if hist.empty:
            return {"error": f"No data for {req.symbol}"}

        data = []
        for date, row in hist.iterrows():
            data.append({
                "date": date.strftime("%Y-%m-%d"),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        return data
    except Exception as e:
        return {"error": str(e)}

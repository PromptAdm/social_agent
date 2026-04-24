"""
Deep health check — verifies live database connectivity.
Used by Better Stack uptime monitoring for a more accurate signal than /health.

GET /health/deep
  200  → {"status": "ok",       "db": "ok"}
  503  → {"status": "degraded", "db": "error", "detail": "..."}
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.dependencies import get_db

router = APIRouter(tags=["Health"])


@router.get("/health/deep")
def deep_health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "db": "error", "detail": str(exc)},
        )

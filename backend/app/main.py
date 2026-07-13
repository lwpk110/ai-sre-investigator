"""FastAPI 应用入口 — uvicorn app.main:app --reload。"""

from __future__ import annotations

from app.api.routes import create_app

app = create_app()

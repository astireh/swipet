"""Общие зависимости FastAPI: сессия БД и текущий пользователь.
Вынесены из main.py, чтобы их могли использовать main.py, reco_api.py и files_api.py без циклического импорта."""
import os
from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

import auth
import crud
from database import SessionLocal
from models import User


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def bearer_token(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


def get_current_user(authorization: Optional[str] = Header(None),
                     x_user_id: Optional[int] = Header(None),
                     db: Session = Depends(get_db)) -> User:
    """Кто делает запрос.
    1) Фронтенд: заголовок  Authorization: Bearer <токен>  (токен выдают /auth/register и /auth/login).
    2) Для проверки в Swagger и demo.py: заголовок X-User-Id (выключается ALLOW_X_USER_ID=0 в .env)."""
    token = bearer_token(authorization)
    if token:
        user = auth.user_by_token(db, token)
        if user is None:
            raise HTTPException(status_code=401, detail="Сессия истекла, войдите снова")
        return user
    if x_user_id is not None and os.getenv("ALLOW_X_USER_ID", "1") == "1":
        user = crud.get_user_by_id(db, x_user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    raise HTTPException(status_code=401, detail="Нужно войти в аккаунт")

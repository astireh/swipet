"""Общие зависимости FastAPI: сессия БД и текущий пользователь.
Вынесены из main.py, чтобы их могли использовать и main.py, и reco_api.py без циклического импорта."""
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

import crud
from database import SessionLocal
from models import User


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(x_user_id: int = Header(...), db: Session = Depends(get_db)) -> User:
    # ВНИМАНИЕ: пока пользователь определяется по заголовку X-User-Id (как было в main.py).
    # Когда команда сделает проверку токена, менять нужно только эту функцию.
    user = crud.get_user_by_id(db, x_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

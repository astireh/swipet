"""Токены входа: после регистрации или входа пользователь получает токен,
фронтенд отправляет его в каждом запросе в заголовке  Authorization: Bearer <токен>."""
import secrets
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from database import Base
from models import User


class AuthToken(Base):
    __tablename__ = "auth_tokens"
    token = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)


def create_token(db, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    db.add(AuthToken(token=token, user_id=user_id))
    db.commit()
    return token


def user_by_token(db, token: str):
    row = db.get(AuthToken, token)
    return db.get(User, row.user_id) if row else None


def delete_token(db, token: str):
    row = db.get(AuthToken, token)
    if row:
        db.delete(row)
        db.commit()

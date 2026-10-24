import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# 1) Если в .env задан DATABASE_URL (например, sqlite:///./dev.db) — берём его.
# 2) Иначе собираем адрес PostgreSQL из DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME")
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SQLite по умолчанию запрещает работу из разных потоков, а FastAPI использует несколько потоков
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# SQL_ECHO=1 в .env включает печать всех SQL-запросов (для отладки)
engine = create_engine(DATABASE_URL, echo=os.getenv("SQL_ECHO") == "1", connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

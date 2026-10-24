"""API рекомендаций: лента (ruBERT + правила + реклама), свайпы с лимитом,
объяснение карточки от GigaChat, анкета предпочтений и подписка.

Подключается в main.py одной строкой: app.include_router(reco_api.router)
"""
import os
import threading
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

import crud
import embedders
import files_api
import monetization as mon
import reco_explain
import reco_feed
import reco_vectors
from database import Base, SessionLocal, engine
from deps import get_current_user, get_db
from models import Seller, User

router = APIRouter(prefix="/api/v1", tags=["Рекомендации"])


# ---------- Запуск: таблицы и прогрев модели ----------

def init_schema():
    """Создаёт все таблицы и добавляет новые колонки в старые базы."""
    Base.metadata.create_all(bind=engine)
    # колонки, которых нет в базах, созданных старой версией кода
    new_columns = {"pets": {"description": "TEXT"},
                   "users": {"user_type": "VARCHAR", "goal": "VARCHAR"}}
    for table, cols in new_columns.items():
        existing = {c["name"] for c in inspect(engine).get_columns(table)}
        for col, sql_type in cols.items():
            if col not in existing:
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {sql_type}"))
                print(f"[reco] В таблицу {table} добавлена колонка {col}")


def refresh_vectors_background():
    """Досчитать недостающие векторы (питомцы и опросы).
    Нейросеть загружается, только если действительно появился новый текст."""
    db = SessionLocal()
    try:
        if reco_vectors.missing_count(db) == 0:
            return
        if not embedders.enabled():
            print("[reco] Есть новые тексты без векторов, но ruBERT выключен (EMBED_ENABLED=0):"
                  " они ранжируются по правилам. Запустите python build_vectors.py")
            return
        pets_n, prefs_n = reco_vectors.sync_all(db)
        print(f"[reco] Посчитаны векторы: питомцев {pets_n}, опросов {prefs_n}")
    except Exception as error:
        print("[reco] Не удалось посчитать векторы:", error)
    finally:
        db.close()


def warmup():
    """При старте сервера: загрузить готовые векторы из vectors.json (без нейросети),
    а недостающие досчитать В ФОНЕ. Сервер стартует сразу, лента работает сразу."""
    db = SessionLocal()
    try:
        loaded = reco_vectors.import_json(db)
        missing = reco_vectors.missing_count(db)
        print(f"[reco] Векторов из vectors.json: {loaded}, не хватает: {missing}")
    except Exception as error:
        print("[reco] Не удалось прочитать готовые векторы:", error)
        missing = 1
    finally:
        db.close()
    if missing:
        threading.Thread(target=refresh_vectors_background, daemon=True).start()


# ---------- Карточка ленты ----------

def feed_card(item, photos=None) -> dict:
    pet = item["pet"]
    return {
        "id": pet.id,
        "seller_id": pet.seller_id,
        "name": pet.nickname,
        "category": pet.pet_type,
        "breed": pet.breed,
        "gender": pet.gender,
        "price": pet.price,
        "is_free": not pet.price,
        "age_in_months": pet.age_in_months,
        "color": pet.color,
        "description": pet.description,
        "city": item["city"],
        "seller_name": item.get("seller_name"),
        "photo_url": (photos or {}).get(pet.id),
        "status": pet.publication_status,
        "created_at": pet.publication_date,
        # данные рекомендаций
        "source": item["source"],              # рекомендация / случайная / реклама
        "is_promo": item["source"] == "реклама",  # фронт обязан показать пометку «Реклама»
        "score": item["score"],
        "reasons": item["reasons"],
    }


# ---------- Лента и свайпы ----------

@router.get("/feed")
def get_feed(limit: int = Query(10, ge=1, le=50),
             category: Optional[str] = None,
             free: Optional[bool] = None,
             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Персональная лента: ruBERT + анкета + лайки, каждая 5-я карточка случайная, каждая 6-я реклама."""
    items = mon.build_feed(db, user.id, limit=limit, category=category, free=free)
    reco_explain.remember_feed(db, user.id, items)
    photos = files_api.pet_photos(db, [it["id"] for it in items])
    return [feed_card(it, photos) for it in items]


class SwipeRequest(BaseModel):
    direction: str      # right - лайк, left - пропуск


@router.post("/feed/{animal_id}/swipe")
def swipe(animal_id: int, req: SwipeRequest,
          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pet = crud.get_pet_by_id(db, animal_id)
    if pet is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    if pet.publication_status != "active":
        raise HTTPException(status_code=400, detail="Анкета снята с публикации")
    if pet.seller.user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя свайпать собственную анкету")
    if mon.swipes_left(db, user.id) <= 0:
        raise HTTPException(status_code=429, detail="Свайпы на сегодня закончились. Премиум увеличивает лимит.")

    try:
        swipe_obj, chat = crud.create_swipe(db, user.id, animal_id, req.direction)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    mon.register_swipe(db, user.id)

    return {"status": "ok", "swipe_id": swipe_obj.id, "chat_id": chat.id if chat else None,
            "swipes_left": mon.swipes_left(db, user.id)}


@router.get("/feed/{animal_id}/why")
def why_this_card(animal_id: int, refresh: bool = False,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """GigaChat объясняет, почему карточка в ленте. refresh=true - сгенерировать заново."""
    try:
        return reco_explain.explain(db, user.id, animal_id, refresh=refresh)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------- Анкета предпочтений (опрос при первом входе) ----------

class PrefsRequest(BaseModel):
    species: Optional[str] = None                    # cat, dog, parrot, ...
    age_min: Optional[int] = Field(None, ge=0)       # возраст питомца в месяцах
    age_max: Optional[int] = Field(None, ge=0)
    city: Optional[str] = None                       # пусто - город из профиля
    about: Optional[str] = Field(None, max_length=500)  # «хочу спокойную кошку для квартиры»


def prefs_to_dict(prefs) -> dict:
    fields = ("species", "age_min", "age_max", "city", "about")
    return {f: getattr(prefs, f) if prefs else None for f in fields}


@router.get("/me/prefs")
def get_prefs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return prefs_to_dict(db.get(reco_feed.UserPrefs, user.id))


@router.put("/me/prefs")
def save_prefs(req: PrefsRequest, background_tasks: BackgroundTasks,
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.age_min is not None and req.age_max is not None and req.age_min > req.age_max:
        raise HTTPException(status_code=400, detail="age_min больше age_max")
    prefs = db.get(reco_feed.UserPrefs, user.id)
    if prefs is None:
        prefs = reco_feed.UserPrefs(user_id=user.id)
        db.add(prefs)
    for field, value in req.model_dump().items():
        setattr(prefs, field, value)
    db.commit()
    background_tasks.add_task(refresh_vectors_background)   # вектор текста из опроса - в фоне
    return prefs_to_dict(prefs)


# ---------- Подписка и лимит свайпов ----------

def _owner(db: Session, user: User, as_seller: bool):
    if not as_seller:
        return "user", user.id
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if seller is None:
        raise HTTPException(status_code=400, detail="У вас нет профиля продавца")
    return "seller", seller.id


@router.get("/me/subscription")
def subscription_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    return {
        "premium_until": mon.premium_until(db, "user", user.id),
        "is_premium": mon.is_premium(db, "user", user.id),
        "swipes_left": mon.swipes_left(db, user.id),
        "daily_limit": mon.daily_limit(db, user.id),
        "seller_premium_until": mon.premium_until(db, "seller", seller.id) if seller else None,
    }


@router.post("/me/subscription/activate")
def activate_subscription(as_seller: bool = False,
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Оплата имитируется. as_seller=true - премиум продавца (его анкеты продвигаются в ленте)."""
    owner_type, owner_id = _owner(db, user, as_seller)
    return {"owner_type": owner_type, "premium_until": mon.activate_premium(db, owner_type, owner_id)}


@router.post("/me/subscription/cancel")
def cancel_subscription(as_seller: bool = False,
                        user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owner_type, owner_id = _owner(db, user, as_seller)
    mon.cancel_premium(db, owner_type, owner_id)
    return {"owner_type": owner_type, "premium_until": None, "cancelled_at": datetime.now()}

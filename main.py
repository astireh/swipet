import os
from contextlib import asynccontextmanager
from typing import Optional

import bcrypt
from fastapi import FastAPI, Depends, Header, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

import auth
import crud
import files_api                                  # фото питомцев (таблица files, папка uploads/)
import reco_api                                   # лента, свайпы, GigaChat, подписка
from deps import get_db, get_current_user, bearer_token
from models import User, Seller, Pet, Chat, Message, Notification

# Создаём все таблицы (команды, рекомендаций, файлов, токенов) + новые колонки в старых базах
reco_api.init_schema()


# --- СХЕМЫ ЗАПРОСОВ ---
class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=3)
    displayName: str                # имя и фамилия
    phone: str                      # в БД phone обязателен и уникален
    city: Optional[str] = None
    user_type: str = "fiz"          # fiz / ip / yur
    goal: str = "find"              # find - ищу питомца, breed - разведение и продажа


class LoginRequest(BaseModel):
    email: str                      # e-mail или телефон
    password: str


class CreateAnimalRequest(BaseModel):
    name: str                       # -> pets.nickname
    category: str                   # -> pets.pet_type (cat / dog ...)
    gender: str                     # в БД обязателен (male / female)
    is_free: bool = False
    price: float = 0.0
    breed: Optional[str] = None
    age_in_months: Optional[int] = None
    color: Optional[str] = None
    description: Optional[str] = None


class MessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


# --- ПРИЛОЖЕНИЕ ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    reco_api.warmup()               # готовые векторы ruBERT из vectors.json, недостающие - в фоне
    yield


app = FastAPI(title="petomnik API", version="1.0", lifespan=lifespan)

# Разрешаем фронтенду (React на другом порту) обращаться к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,"
                                            "http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reco_api.router)   # /feed, /feed/{id}/swipe, /feed/{id}/why, /me/prefs, /me/subscription
app.include_router(files_api.router)  # /animals/{id}/photos
app.mount(files_api.UPLOAD_URL, StaticFiles(directory=files_api.UPLOAD_DIR), name="uploads")


def can_create_ad(user: User) -> bool:
    """Объявления создают ИП, юрлица и те, кто выбрал цель «разведение и продажа»."""
    return user.user_type in ("ip", "yur") or user.goal == "breed" or bool(user.sellers)


def get_or_create_seller(db: Session, user: User) -> Seller:
    """Профиль продавца для пользователя; создаётся при регистрации продавца или первой публикации."""
    seller = db.query(Seller).filter(Seller.user_id == user.id).first()
    if seller is None:
        seller_type = "company" if user.user_type == "yur" else "individual"
        seller = crud.create_seller(db, seller_type, user_id=user.id,
                                    name=user.name, email=user.email, phone=user.phone)
    if not seller.city and user.city:   # без города не работает совпадение «из вашего города»
        seller.city = user.city
        db.commit()
    return seller


def profile_to_dict(user: User) -> dict:
    first, _, last = (user.name or "").partition(" ")
    seller = user.sellers[0] if user.sellers else None
    return {"id": user.id, "email": user.email, "phone": user.phone, "city": user.city,
            "displayName": user.name, "firstName": first, "lastName": last,
            "user_type": user.user_type or "fiz", "goal": user.goal or "find",
            "can_create_ad": can_create_ad(user), "seller_id": seller.id if seller else None}


def auth_response(db: Session, user: User) -> dict:
    return {"token": auth.create_token(db, user.id), "userId": user.id,
            "displayName": user.name, "profile": profile_to_dict(user)}


def pet_to_dict(pet: Pet, photo_url: Optional[str] = None) -> dict:
    return {
        "id": pet.id,
        "seller_id": pet.seller_id,
        "seller_name": pet.seller.name if pet.seller else None,
        "name": pet.nickname,
        "category": pet.pet_type,
        "breed": pet.breed,
        "gender": pet.gender,
        "price": pet.price,
        "is_free": not pet.price,
        "age_in_months": pet.age_in_months,
        "color": pet.color,
        "description": pet.description,
        "city": pet.seller.city if pet.seller else None,
        "photo_url": photo_url,
        "status": pet.publication_status,
        "created_at": pet.publication_date,
    }


def chat_to_dict(db: Session, chat: Chat, user: User) -> dict:
    """Чат глазами текущего пользователя: с кем переписка, про какого питомца, последнее сообщение."""
    swipe = chat.swipe
    pet = swipe.pet
    my_role = "user" if swipe.user_id == user.id else "seller"
    partner = chat.seller.name if my_role == "user" else swipe.user.name
    last = (db.query(Message).filter(Message.chat_id == chat.id)
            .order_by(Message.sent_date.desc(), Message.id.desc()).first())
    unread = (db.query(Message).filter(Message.chat_id == chat.id, Message.is_read.is_(False),
                                       Message.sender_type != my_role).count())
    return {
        "id": chat.id,
        "seller_id": chat.seller_id,
        "user_id": swipe.user_id,
        "pet_id": swipe.pet_id,
        "pet_name": pet.nickname if pet else None,
        "pet_photo": files_api.pet_photos(db, [swipe.pet_id]).get(swipe.pet_id),
        "my_role": my_role,                     # user - я покупатель, seller - я продавец
        "partner_name": partner,
        "last_message": last.text if last else None,
        "unread": unread,
        "last_message_date": chat.last_message_date,
    }


def message_to_dict(m) -> dict:
    return {
        "id": m.id,
        "chat_id": m.chat_id,
        "sender_type": m.sender_type,
        "sender_id": m.sender_id,
        "text": m.text,
        "sent_date": m.sent_date,
        "is_read": m.is_read,
    }


def get_chat_role(db: Session, chat_id: int, user: User):
    """Возвращает (chat, роль пользователя в чате, id отправителя)."""
    chat = db.get(Chat, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.swipe.user_id == user.id:
        return chat, "user", user.id
    if chat.seller.user_id == user.id:
        return chat, "seller", chat.seller_id
    raise HTTPException(status_code=403, detail="Forbidden")


# --- АККАУНТ И ПРОФИЛЬ ---
@app.post("/api/v1/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if req.user_type not in ("fiz", "ip", "yur") or req.goal not in ("find", "breed"):
        raise HTTPException(status_code=400, detail="user_type: fiz/ip/yur, goal: find/breed")
    email = req.email.strip().lower()
    if crud.get_user_by_email(db, email):
        raise HTTPException(status_code=409, detail="Пользователь с таким e-mail уже есть")

    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    try:
        user = crud.create_user(db, name=req.displayName.strip(), password=hashed,
                                email=email, phone=req.phone.strip())
    except ValueError:
        raise HTTPException(status_code=409, detail="Пользователь с таким телефоном уже есть")
    user.city = (req.city or "").strip() or None
    user.user_type = req.user_type
    user.goal = req.goal
    db.commit()
    if can_create_ad(user):
        get_or_create_seller(db, user)      # продавцу сразу создаём профиль продавца
    db.refresh(user)
    return auth_response(db, user)


@app.post("/api/v1/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    login_value = req.email.strip()
    user = (db.query(User).filter(or_(User.email == login_value.lower(), User.phone == login_value))
            .first())
    try:
        ok = user is not None and bcrypt.checkpw(req.password.encode("utf-8"), user.password.encode("utf-8"))
    except ValueError:          # в базе не bcrypt-хеш (старые тестовые данные) - не падаем с 500
        ok = False
    if not ok:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    return auth_response(db, user)


@app.post("/api/v1/auth/logout")
def logout(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    token = bearer_token(authorization)
    if token:
        auth.delete_token(db, token)
    return {"status": "ok"}


@app.get("/api/v1/profile/me")
def get_profile(user: User = Depends(get_current_user)):
    return profile_to_dict(user)


# --- АНКЕТЫ ЖИВОТНЫХ ---
@app.post("/api/v1/animals")
def create_animal(req: CreateAnimalRequest, background_tasks: BackgroundTasks,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.gender not in ("male", "female"):
        raise HTTPException(status_code=400, detail="Укажите пол: male или female")
    seller = get_or_create_seller(db, user)
    price = 0.0 if req.is_free else max(0.0, req.price)
    try:
        pet = crud.create_pet(db, seller_id=seller.id, pet_type=req.category, gender=req.gender,
                              nickname=req.name.strip() or None, breed=req.breed, price=price,
                              age_in_months=req.age_in_months)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    pet.color = req.color or None
    pet.description = req.description or None     # по описанию считается вектор ruBERT
    db.commit()
    db.refresh(pet)
    background_tasks.add_task(reco_api.refresh_vectors_background)   # вектор ruBERT в фоне
    return pet_to_dict(pet)


@app.get("/api/v1/me/animals")
def my_animals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Анкеты, которые разместил текущий пользователь."""
    seller_ids = [s.id for s in user.sellers]
    if not seller_ids:
        return []
    pets = (db.query(Pet).filter(Pet.seller_id.in_(seller_ids))
            .order_by(Pet.publication_date.desc()).all())
    photos = files_api.pet_photos(db, [p.id for p in pets])
    return [pet_to_dict(p, photos.get(p.id)) for p in pets]


@app.get("/api/v1/animals/{animal_id}")
def get_animal(animal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pet = crud.get_pet_by_id(db, animal_id)
    if pet is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    return pet_to_dict(pet, files_api.pet_photos(db, [pet.id]).get(pet.id))


@app.patch("/api/v1/animals/{animal_id}/status")
def change_animal_status(animal_id: int, status: str, user: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    pet = crud.get_pet_by_id(db, animal_id)
    if pet is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    if pet.seller.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        pet = crud.set_pet_status(db, animal_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return pet_to_dict(pet, files_api.pet_photos(db, [pet.id]).get(pet.id))


# --- ЛЕНТА И СВАЙПЫ ---
# /api/v1/feed и /api/v1/feed/{id}/swipe находятся в reco_api.py


# --- ЧАТЫ И СООБЩЕНИЯ ---
@app.get("/api/v1/chats")
def my_chats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = {c.id: c for c in crud.get_chats_by_user(db, user.id)}
    for seller in user.sellers:
        for c in crud.get_chats_by_seller(db, seller.id):
            chats[c.id] = c
    ordered = sorted(chats.values(), key=lambda c: c.last_message_date or c.date_creation, reverse=True)
    return [chat_to_dict(db, c, user) for c in ordered]


@app.get("/api/v1/chats/{chat_id}/messages")
def chat_messages(chat_id: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    _, role, _ = get_chat_role(db, chat_id, user)
    messages = crud.get_messages(db, chat_id)
    crud.mark_chat_read(db, chat_id, role)
    return [message_to_dict(m) for m in messages]


@app.post("/api/v1/chats/{chat_id}/messages")
def post_message(chat_id: int, req: MessageRequest, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    chat, role, sender_id = get_chat_role(db, chat_id, user)
    try:
        msg = crud.send_message(db, chat_id, role, sender_id, req.text.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # уведомление собеседнику (как в WebSocket-чате)
    if role == "user":
        db.add(Notification(recipient_type="seller", recipient_id=chat.seller_id,
                            notification_type="new_message"))
    else:
        db.add(Notification(recipient_type="user", recipient_id=chat.swipe.user_id,
                            notification_type="new_message"))
    db.commit()
    return message_to_dict(msg)


# --- УВЕДОМЛЕНИЯ ---
@app.get("/api/v1/notifications")
def my_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = [("user", user.id)] + [("seller", s.id) for s in user.sellers]
    out = []
    for rtype, rid in result:
        for n in crud.get_notifications(db, rtype, rid):
            out.append({"id": n.id, "recipient_type": n.recipient_type,
                        "type": n.notification_type, "date": n.notification_date})
    out.sort(key=lambda n: n["date"], reverse=True)
    return out

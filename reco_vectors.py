"""Векторы ruBERT: питомцы, тексты из опроса, вкус пользователя и поиск похожих.

Главное правило скорости: нейросеть (embedders.encode) вызывается ТОЛЬКО когда
появился новый текст (новый питомец, изменилось описание, новый текст в опросе).
Готовые векторы лежат в базе (pet_vectors, prefs_vectors) и в файле vectors.json,
поэтому лента считается без нейросети, за миллисекунды.
"""
import json
import os
from datetime import datetime

import numpy as np
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text

import embedders
from database import Base
from models import Pet, Swipe

DISLIKE_WEIGHT = 0.5   # дизлайк влияет вдвое слабее лайка

TYPE_RU = {"cat": "кот", "dog": "собака", "hamster": "хомяк", "fish": "рыбка",
           "parrot": "попугай", "cow": "корова", "rabbit": "кролик"}

# Файл с готовыми векторами (создаёт python build_vectors.py)
VECTORS_FILE = os.getenv("VECTORS_FILE",
                         os.path.join(os.path.dirname(os.path.abspath(__file__)), "vectors.json"))


class PetVector(Base):
    """Вектор питомца для каждой модели."""
    __tablename__ = "pet_vectors"
    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), primary_key=True)
    model = Column(String, primary_key=True)          # какой моделью посчитан
    source_text = Column(Text, nullable=False)        # из какого текста
    vector = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.now)


class PrefsVector(Base):
    """Вектор текста из опроса («хочу спокойную кошку для квартиры»).
    Считается один раз при сохранении анкеты, а не при каждом запросе ленты."""
    __tablename__ = "prefs_vectors"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    model = Column(String, primary_key=True)
    source_text = Column(Text, nullable=False)
    vector = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.now)


def pet_text(pet):
    """Склеивает смысловые поля питомца в один текст.
    Возраст, вес, цену и город сюда не кладём: их сравниваем правилами."""
    kind = TYPE_RU.get(pet.pet_type, pet.pet_type)
    parts = [kind]
    if pet.breed:
        parts.append(f"порода {pet.breed}")
    if pet.color:
        parts.append(f"окрас {pet.color}")
    text = ", ".join(parts) + "."
    description = (pet.description or "").strip()   # поле Pet.description (заполняет seed.py или API)
    if description:
        text += " " + description
    return text


def _about_texts(db):
    """{user_id: текст из опроса} для всех, кто его заполнил."""
    from reco_feed import UserPrefs   # импорт здесь: reco_feed сам импортирует этот файл
    return {p.user_id: p.about.strip() for p in db.query(UserPrefs) if p.about and p.about.strip()}


def _save(db, table, key_field, key, model, text, vec, row):
    if row is None:
        db.add(table(**{key_field: key}, model=model, source_text=text, vector=vec))
    else:
        row.source_text = text
        row.vector = vec
        row.updated_at = datetime.now()


# ---------- Пересчёт векторов (здесь работает нейросеть) ----------

def sync_pet_vectors(db):
    """Считает векторы питомцам, у кого их нет или изменился текст. Возвращает, скольким посчитал.
    Если всё актуально, нейросеть даже не загружается."""
    model = embedders.model_name()
    existing = {v.pet_id: v for v in db.query(PetVector).filter(PetVector.model == model)}
    todo = []
    for pet in db.query(Pet).all():
        text = pet_text(pet)
        row = existing.get(pet.id)
        if row is None or row.source_text != text:
            todo.append((pet.id, text, row))
    if not todo:
        return 0
    matrix = embedders.encode([text for _, text, _ in todo])
    for (pet_id, text, row), vec in zip(todo, matrix):
        _save(db, PetVector, "pet_id", pet_id, model, text, vec.tolist(), row)
    db.commit()
    return len(todo)


def sync_prefs_vectors(db):
    """То же для текстов из опроса. Возвращает, скольким посчитал."""
    model = embedders.model_name()
    existing = {v.user_id: v for v in db.query(PrefsVector).filter(PrefsVector.model == model)}
    todo = [(uid, text, existing.get(uid)) for uid, text in _about_texts(db).items()
            if existing.get(uid) is None or existing[uid].source_text != text]
    if not todo:
        return 0
    matrix = embedders.encode([text for _, text, _ in todo])
    for (uid, text, row), vec in zip(todo, matrix):
        _save(db, PrefsVector, "user_id", uid, model, text, vec.tolist(), row)
    db.commit()
    return len(todo)


def sync_all(db):
    """Питомцы и опросы. Возвращает (питомцев, опросов)."""
    return sync_pet_vectors(db), sync_prefs_vectors(db)


def missing_count(db):
    """Сколько векторов не хватает (питомцы + опросы). Нейросеть не нужна."""
    model = embedders.model_name()
    pets = {v.pet_id: v.source_text for v in db.query(PetVector).filter(PetVector.model == model)}
    prefs = {v.user_id: v.source_text for v in db.query(PrefsVector).filter(PrefsVector.model == model)}
    n = sum(1 for pet in db.query(Pet) if pets.get(pet.id) != pet_text(pet))
    n += sum(1 for uid, text in _about_texts(db).items() if prefs.get(uid) != text)
    return n


# ---------- Файл vectors.json ----------

def export_json(db, path=VECTORS_FILE):
    """Сохраняет все векторы текущей модели в JSON. Возвращает число записей."""
    model = embedders.model_name()

    def rows(table, key):
        return [{key: getattr(r, key), "source_text": r.source_text,
                 "vector": [round(x, 6) for x in r.vector]}
                for r in db.query(table).filter(table.model == model)]

    data = {"model": model, "created_at": datetime.now().isoformat(timespec="seconds"),
            "pets": rows(PetVector, "pet_id"), "prefs": rows(PrefsVector, "user_id")}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return len(data["pets"]) + len(data["prefs"])


def import_json(db, path=VECTORS_FILE):
    """Загружает готовые векторы из JSON в базу БЕЗ нейросети.
    Берёт только те, у которых текст совпадает с текущим (устаревшие пропускает)."""
    if not os.path.exists(path):
        return 0
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    model = embedders.model_name()
    if data.get("model") != model:
        print(f"[reco] {os.path.basename(path)} посчитан моделью {data.get('model')}, а нужна {model}: пропускаю")
        return 0

    loaded = 0
    pet_texts = {pet.id: pet_text(pet) for pet in db.query(Pet)}
    pet_rows = {v.pet_id: v for v in db.query(PetVector).filter(PetVector.model == model)}
    for item in data.get("pets", []):
        pid, text = item["pet_id"], item["source_text"]
        row = pet_rows.get(pid)
        if pet_texts.get(pid) == text and (row is None or row.source_text != text):
            _save(db, PetVector, "pet_id", pid, model, text, item["vector"], row)
            loaded += 1

    about = _about_texts(db)
    prefs_rows = {v.user_id: v for v in db.query(PrefsVector).filter(PrefsVector.model == model)}
    for item in data.get("prefs", []):
        uid, text = item["user_id"], item["source_text"]
        row = prefs_rows.get(uid)
        if about.get(uid) == text and (row is None or row.source_text != text):
            _save(db, PrefsVector, "user_id", uid, model, text, item["vector"], row)
            loaded += 1
    db.commit()
    return loaded


# ---------- Использование готовых векторов (нейросеть НЕ нужна) ----------

def about_vector(db, user_id, about):
    """Готовый вектор текста из опроса или None, если ещё не посчитан (тогда лента идёт по правилам)."""
    row = db.get(PrefsVector, (user_id, embedders.model_name()))
    if row is None or not about or row.source_text != about.strip():
        return None
    return np.array(row.vector)


def user_vector(db, user_id):
    """Вектор вкуса: лайки (right) притягивают, дизлайки (left) отталкивают слабее.
    Если свайпов нет, возвращает None (холодный старт)."""
    rows = (db.query(Swipe.direction, PetVector.vector)
            .join(PetVector, PetVector.pet_id == Swipe.pet_id)
            .filter(Swipe.user_id == user_id, PetVector.model == embedders.model_name())
            .all())
    if not rows:
        return None
    total = np.zeros(len(rows[0][1]))
    for direction, vec in rows:
        weight = 1.0 if direction == "right" else -DISLIKE_WEIGHT
        total += weight * np.array(vec)
    norm = np.linalg.norm(total)
    return total / norm if norm > 0 else None


def rank_pets_by_vector(db, vec, pet_ids=None):
    """Список (id питомца, сходство) от самого близкого к самому далёкому."""
    result = []
    for row in db.query(PetVector).filter(PetVector.model == embedders.model_name()):
        if pet_ids is None or row.pet_id in pet_ids:
            result.append((row.pet_id, float(np.dot(vec, np.array(row.vector)))))
    result.sort(key=lambda item: item[1], reverse=True)
    return result

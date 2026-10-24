"""Файлы (фото питомцев). Как в ТЗ команды: при загрузке в таблицу files записывается
имя файла, его тип и ссылка, которую генерирует бэкенд. Сами файлы лежат в папке uploads/
и отдаются сервером по адресу /uploads/<имя>."""
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Session

from database import Base
from deps import get_current_user, get_db
from models import Pet, User

UPLOAD_DIR = os.getenv("UPLOAD_DIR",
                       os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
UPLOAD_URL = "/uploads"
MAX_SIZE = 5 * 1024 * 1024        # 5 МБ, как в нефункциональных требованиях
ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

router = APIRouter(prefix="/api/v1", tags=["Файлы"])


class FileRecord(Base):
    __tablename__ = "files"
    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pet_id = Column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), index=True)
    filename = Column(String, nullable=False)       # имя, под которым файл загрузили
    content_type = Column(String, nullable=False)   # image/jpeg ...
    size = Column(Integer)
    url = Column(String, nullable=False)            # ссылка, которую сгенерировал бэкенд
    created_at = Column(DateTime, default=datetime.now)


def pet_photos(db: Session, pet_ids) -> dict:
    """{id питомца: ссылка на первое фото}."""
    ids = list(pet_ids)
    if not ids:
        return {}
    result = {}
    rows = (db.query(FileRecord).filter(FileRecord.pet_id.in_(ids))
            .order_by(FileRecord.id).all())
    for row in rows:
        result.setdefault(row.pet_id, row.url)
    return result


@router.post("/animals/{animal_id}/photos")
def upload_pet_photo(animal_id: int, file: UploadFile = File(...),
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Загрузить фото питомца (JPG, PNG или WebP до 5 МБ). Только владелец анкеты."""
    pet = db.get(Pet, animal_id)
    if pet is None:
        raise HTTPException(status_code=404, detail="Animal not found")
    if pet.seller.user_id != user.id:
        raise HTTPException(status_code=403, detail="Это не ваша анкета")
    ext = ALLOWED.get(file.content_type)
    if ext is None:
        raise HTTPException(status_code=400, detail="Нужен файл JPG, PNG или WebP")
    data = file.file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")

    name = uuid.uuid4().hex + ext
    with open(os.path.join(UPLOAD_DIR, name), "wb") as f:
        f.write(data)
    record = FileRecord(owner_user_id=user.id, pet_id=pet.id, filename=file.filename or name,
                        content_type=file.content_type, size=len(data), url=f"{UPLOAD_URL}/{name}")
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "url": record.url, "filename": record.filename}

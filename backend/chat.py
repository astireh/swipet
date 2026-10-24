import json
from fastapi import WebSocket, FastAPI, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy.orm import Session
from datetime import datetime
from database import SessionLocal
from models import User, Seller, Chat, Swipe, Message, Notification
from shemas_chat import MessageCreate, MessageResponse
from websoket import manager

app = FastAPI()

def serialize_message(msg: Message) -> dict:
    return MessageResponse.model_validate(msg).model_dump(mode="json")

def check_chat_access(db: Session, chat_id: int, role: str, participant_id: int):
    chat = db.get(Chat, chat_id)
    if chat is None:
        return None
    if role == "user":
        swipe = db.get(Swipe, chat.swipe_id)
        if swipe is None or swipe.user_id != participant_id:
            return None
    elif role == "seller":
        if chat.seller_id != participant_id:
            return None
    else:
        return None
    return chat

@app.websocket("/ws/chats/{chat_id}")
async def chat_websocket(websocket: WebSocket, chat_id: int, role: str, participant_id: int):
    db = SessionLocal()
    try:
        if role == "user":
            participant = db.get(User, participant_id)
        elif role == "seller":
            participant = db.get(Seller, participant_id)
        else:
            participant = None
        chat = check_chat_access(db, chat_id, role, participant_id)
        if participant is None or chat is None:
            await websocket.close(code=1008)
            return
        await manager.connect(chat_id, websocket)
        messages = (db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.sent_date, Message.id).all())
        await websocket.send_json({"type": "history", "messages": [serialize_message(m) for m in messages],})

        while True:
            try:
                data = await websocket.receive_json()
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Ожидается JSON",})
                continue

            event_type = data.get("type")
            if event_type == "message":
                try:
                    payload = MessageCreate(text=data.get("text", ""))
                except ValidationError as e:
                    await websocket.send_json({"type": "error", "detail": e.errors()[0]["msg"],})
                    continue

                try:
                    chat = check_chat_access(db, chat_id, role, participant_id)
                    if chat is None:
                        await websocket.close(code=1008)
                        return
                    msg = Message(chat_id=chat_id, sender_type=role, sender_id=participant_id, text=payload.text.strip(), sent_date=datetime.now(), is_read=False,)
                    db.add(msg)
                    chat.last_message_date = datetime.now()

                    if role == "user":
                        recipient_type, recipient_id = "seller", chat.seller_id
                    else:
                        swipe = db.get(Swipe, chat.swipe_id)
                        if swipe is None:
                            raise ValueError("Свайп не найден")
                        recipient_type, recipient_id = "user", swipe.user_id
                    db.add(Notification(recipient_type=recipient_type, recipient_id=recipient_id, notification_type="new_message",))
                    db.commit()
                    db.refresh(msg)
                except Exception:
                    db.rollback()
                    await websocket.send_json({"type": "error", "detail": "Не удалось сохранить сообщение",})
                    continue
                await manager.broadcast(chat_id, {"type": "message", "message": serialize_message(msg),})

            elif event_type == "read":
                try:
                    chat = check_chat_access(db, chat_id, role, participant_id)
                    if chat is None:
                        await websocket.close(code=1008)
                        return
                    unread = (db.query(Message).filter(Message.chat_id == chat_id, Message.sender_type != role, Message.is_read.is_(False),).all())
                    for m in unread:
                        m.is_read = True
                    db.commit()
                except Exception:
                    db.rollback()
                    await websocket.send_json({"type": "error", "detail": "Не удалось отметить прочитанными",})
                    continue
                await manager.broadcast(chat_id, {"type": "read", "reader_type": role,})
            else:
                await websocket.send_json({"type": "error", "detail": "Неизвестный тип",})
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(chat_id, websocket)
        db.close()

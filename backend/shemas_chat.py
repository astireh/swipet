from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=4000)

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    chat_id: int
    sender_type: str
    sender_id: int
    text: str
    sent_date: datetime
    is_read: bool

class ChatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    seller_id: int
    swipe_id: int
    last_message_date: datetime | None = None
    date_creation: datetime

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    recipient_type: str
    recipient_id: int
    notification_type: str
    notification_date: datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from app.models.db.base import Base

class ChatLimitModel(Base):
    __tablename__ = 'chat_limits'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    message_count = Column(Integer, default=0)
    first_message_at = Column(DateTime, default=func.now())
    limit_reached_at = Column(DateTime, nullable=True) 
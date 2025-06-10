from sqlalchemy import Column, Integer, DateTime, ForeignKey, func
from app.models.db.base import Base
from datetime import datetime

class ChatLimitModel(Base):
    __tablename__ = 'chat_limits'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    message_count = Column(Integer, default=0)
    session_start_time = Column(DateTime, default=func.now()) 
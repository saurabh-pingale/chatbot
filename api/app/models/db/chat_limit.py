from sqlalchemy import Column, Integer, DateTime, ForeignKey, func, String, CheckConstraint
from app.models.db.base import Base

class ChatLimitModel(Base):
    __tablename__ = 'chat_limits'
    __table_args__ = (
        CheckConstraint(
            '(user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL)', name='check_user_or_guest'
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, unique=True)
    guest_id = Column(String, nullable=True, unique=True)
    message_count = Column(Integer, default=0)
    first_message_at = Column(DateTime, default=func.now())
    limit_reached_at = Column(DateTime, nullable=True) 
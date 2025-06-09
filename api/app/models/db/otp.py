from sqlalchemy import Column, String, Integer, DateTime, func
from app.models.db.base import Base
from datetime import datetime, timezone

class OTPModel(Base):
    __tablename__ = 'otps'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, index=True)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=False) 
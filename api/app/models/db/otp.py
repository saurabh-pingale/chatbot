from sqlalchemy import Column, String, Integer, DateTime, func
from app.models.db.base import Base

class OTPModel(Base):
    __tablename__ = 'otps'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, index=True)
    otp = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False) 
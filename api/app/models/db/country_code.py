from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime
from app.models.db.base import Base

class CountryCodeModel(Base):
    __tablename__ = 'country_codes'
    
    id = Column(Integer, primary_key=True)
    label = Column(String(100), nullable=False)
    value = Column(String(20), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
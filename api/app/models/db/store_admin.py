from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint

from app.models.db.base import Base

class DBStore(Base):
    __tablename__ = 'stores'
    
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime)
    store_name = Column(String)
    store_description = Column(Text, nullable=True)
    preffered_color = Column(String, nullable=True)
    updated_at = Column(DateTime)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)

    conversations = relationship("DBConversation", back_populates="store")
    users = relationship("DBUser", back_populates="store")

class DBUser(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime)
    email = Column(Text)
    city = Column(Text, nullable=True)
    region = Column(Text, nullable=True) 
    country = Column(Text, nullable=True) 
    ip_address = Column(Text, nullable=True)
    updated_at = Column(DateTime)
    store_id = Column(Integer, ForeignKey('stores.id'), nullable=False)

    conversations = relationship("DBConversation", back_populates="user")
    store = relationship("DBStore", back_populates="users")

class DBCollection(Base):
    __tablename__ = 'collections'
    
    id = Column(Integer, primary_key=True)
    title = Column(String, unique=True)
    products_count = Column(Integer)
    
    products = relationship("DBProduct", back_populates="collection")

class DBProduct(Base):
    __tablename__ = 'products'
    __table_args__ = (
        UniqueConstraint('title', 'category', name='uq_title_category'),
        {'sqlite_autoincrement': True, 'extend_existing': True}
    )
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    category = Column(String)
    url = Column(String)
    price = Column(Float)
    image = Column(String)
    collection_id = Column(Integer, ForeignKey('collections.id'))
    
    collection = relationship("DBCollection", back_populates="products")
    
# class ChatbotAnalytics(Base):
#     __tablename__ = 'chatbot_analytics'
    
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     store_id = Column(String, ForeignKey('stores.id'))  
#     email = Column(String)
#     is_anonymous = Column(Boolean, default=False)
#     anonymous_count = Column(Integer, default=0)  
#     total_users = Column(Integer, default=0) 
#     country = Column(String)
#     region = Column(String)
#     city = Column(String)
#     ip = Column(String)
#     chat_interactions = Column(Integer, default=0)
#     first_interaction = Column(DateTime)
#     last_interaction = Column(DateTime)
#     products_added_to_cart = Column(Integer, default=0)
#     products_purchased = Column(Integer, default=0)
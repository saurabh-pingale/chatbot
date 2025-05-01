from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint

from app.models.db.base import Base

class StoreModel(Base):
    __tablename__ = 'stores'
    
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime)
    shop_id = Column(String)
    store_description = Column(Text, nullable=True)
    preferred_color = Column(String, nullable=True)
    updated_at = Column(DateTime)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    support_email = Column(Text, nullable=True)
    support_phone = Column(Text, nullable=True)
    image = Column(String, nullable=True)

    conversations = relationship("ConversationModel", back_populates="store")
    users = relationship("UserModel", back_populates="store")
    checkout_products = relationship("CheckoutProductModel", back_populates="store")

class UserModel(Base):
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

    conversations = relationship("ConversationModel", back_populates="user")
    store = relationship("StoreModel", back_populates="users")
    checkout_products = relationship("CheckoutProductModel", back_populates="user")

class CollectionModel(Base):
    __tablename__ = 'collections'
    
    id = Column(Integer, primary_key=True)
    title = Column(String, unique=True)
    products_count = Column(Integer)
    
    products = relationship("ProductModel", back_populates="collection")
    checkout_products = relationship("CheckoutProductModel", back_populates="collection")

class ProductModel(Base):
    __tablename__ = 'products'
    __table_args__ = (
        UniqueConstraint('title', 'category', name='uq_title_category'),
        {'sqlite_autoincrement': True, 'extend_existing': True}
    )
    
    id = Column(BigInteger, primary_key=True)
    title = Column(String, unique=True)
    description = Column(String)
    category = Column(String)
    url = Column(String)
    price = Column(Float)
    image = Column(String)
    collection_id = Column(Integer, ForeignKey('collections.id'))
    
    collection = relationship("CollectionModel", back_populates="products")
    checkout_products = relationship("CheckoutProductModel", back_populates="product")
    
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
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, BigInteger, Boolean, func, Date, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from datetime import datetime

from app.models.db.base import Base

class ShopModel(Base):
    __tablename__ = 'shops'
    
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    shop_id = Column(String, unique=True, index=True, nullable=False)
    shop_description = Column(Text, nullable=True)
    preferred_color = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    support_email = Column(Text, nullable=True)
    support_phone = Column(Text, nullable=True)
    image = Column(String, nullable=True)
    show_email_gate = Column(Boolean, default=False, nullable=False)
    owner_name = Column(String, nullable=True)
    owner_email = Column(String, nullable=True)
    owner_location = Column(String, nullable=True)
    plan = Column(String, nullable=True)
    plan_start_date = Column(DateTime, nullable=True)
    plan_end_date = Column(DateTime, nullable=True)
    setup_completed = Column(Boolean, default=False, nullable=False)

    conversations = relationship("ConversationModel", back_populates="shop")
    users = relationship("UserModel", back_populates="shop")
    checkout_products = relationship("CheckoutProductModel", back_populates="shop")

class UserModel(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=func.now())
    email = Column(Text, nullable=False)
    city = Column(Text, nullable=True)
    region = Column(Text, nullable=True) 
    country = Column(Text, nullable=True) 
    ip_address = Column(Text, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now())
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)

    conversations = relationship("ConversationModel", back_populates="user")
    shop = relationship("ShopModel", back_populates="users")
    checkout_products = relationship("CheckoutProductModel", back_populates="user")
    analytics = relationship("UserShopAnalyticsModel", back_populates="user", uselist=False)

    __table_args__ = (UniqueConstraint('email', 'shop_id', name='uq_user_email_shop_id'),)

class CollectionModel(Base):
    __tablename__ = 'collections'
    
    id = Column(Integer, primary_key=True)
    title = Column(String, unique=True)
    products_count = Column(Integer)
    
    products = relationship("ProductModel", back_populates="collection")
    checkout_products = relationship("CheckoutProductModel", back_populates="collection")

class ProductModel(Base):
    __tablename__ = 'products'
    __table_args__ = {'sqlite_autoincrement': True, 'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True, autoincrement=False)
    title = Column(String)
    description = Column(String)
    category = Column(String)
    url = Column(String)
    price = Column(Float)
    image = Column(String)
    collection_id = Column(Integer, ForeignKey('collections.id'))
    
    collection = relationship("CollectionModel", back_populates="products")
    checkout_products = relationship("CheckoutProductModel", back_populates="product")
    
class UserShopAnalyticsModel(Base):
    __tablename__ = 'user_shop_analytics'
    __table_args__ = (
        Index('uq_user_shop_date', 'user_id', 'shop_id', 'date', unique=True, postgresql_where=Column('user_id').isnot(None)),
        Index('uq_guest_shop_date', 'guest_id', 'shop_id', 'date', unique=True, postgresql_where=Column('guest_id').isnot(None)),
        
        CheckConstraint(
            '(user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL)', 
            name='check_user_or_guest'
        ),
        
        Index('ix_user_shop_analytics_date', 'date'),
        Index('ix_user_shop_analytics_shop_id', 'shop_id'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    guest_id = Column(String(255), nullable=True, index=True)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False, index=True)
    date = Column(Date, default=func.current_date(), nullable=False, index=True)
    chat_interactions_count = Column(Integer, default=0, nullable=False)
    opened_chatbot_count = Column(Integer, default=0, nullable=False)
    added_to_cart_count = Column(Integer, default=0, nullable=False)
    purchased_count = Column(Integer, default=0, nullable=False)
    purchase_amount = Column(Float, default=0.0, nullable=False)
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)
    utm_term = Column(String, nullable=True)
    utm_content = Column(String, nullable=True)

    user = relationship("UserModel", back_populates="analytics")
    shop = relationship("ShopModel")
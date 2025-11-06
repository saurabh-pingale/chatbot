from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, BigInteger, Boolean, func, Index
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from datetime import datetime
import uuid

from app.models.db.base import Base
from app.models.db.cart import CartItemModel

class ShopModel(Base):
    __tablename__ = 'shops'
    
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    shop_id = Column(String, unique=True, index=True, nullable=False)
    access_token = Column(String(500), nullable=True)
    shop_description = Column(Text, nullable=True)
    preferred_color = Column(String, nullable=True)
    region = Column(String, nullable=True)
    country = Column(String, nullable=True)
    support_email = Column(Text, nullable=True)
    support_phone = Column(Text, nullable=True)
    support_country_code = Column(String(5), nullable=True)
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
    integrations = relationship("IntegrationModel", back_populates="shop")
    subscriptions = relationship("SubscriptionModel", back_populates="shop")
    products = relationship("ProductModel", back_populates="shop")
    offers = relationship("OfferModel", back_populates="shop", cascade="all, delete-orphan")
    shop_metadata = relationship("ShopMetadataModel", back_populates="shop", cascade="all, delete-orphan", uselist=False)
    collections = relationship("CollectionModel", back_populates="shop", cascade="all, delete-orphan")
    orders = relationship("OrderModel", back_populates="shop")
    cart_items = relationship("CartItemModel", back_populates="shop", cascade="all, delete-orphan")

class UserModel(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=func.now())
    email = Column(Text, nullable=True)
    city = Column(Text, nullable=True)
    region = Column(Text, nullable=True) 
    country = Column(Text, nullable=True) 
    ip_address = Column(Text, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now())
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)

    conversations = relationship("ConversationModel", back_populates="user")
    shop = relationship("ShopModel", back_populates="users")
    checkout_products = relationship("CheckoutProductModel", back_populates="user")
    analytics = relationship("UserShopAnalyticsModel", back_populates="user")
    orders = relationship("OrderModel", back_populates="user")
    cart_items = relationship("CartItemModel", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('email', 'shop_id', name='uq_user_email_shop_id'),)

class CollectionModel(Base):
    __tablename__ = 'collections'
    __table_args__ = (
        UniqueConstraint('shop_id', 'title', name='_shop_id_title_uc'),
    )
    
    id = Column(Integer, primary_key=True)
    title = Column(String, index=True)
    products_count = Column(Integer)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    
    shop = relationship("ShopModel", back_populates="collections")
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
    variant_id = Column(BigInteger, unique=True ,nullable=True)
    variant_quantity = Column(Integer)
    collection_id = Column(Integer, ForeignKey('collections.id'))
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    
    collection = relationship("CollectionModel", back_populates="products")
    checkout_products = relationship("CheckoutProductModel", back_populates="product", primaryjoin="ProductModel.variant_id==CheckoutProductModel.variant_id")
    shop = relationship("ShopModel", back_populates="products")
    offers = relationship("OfferModel", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItemModel", back_populates="product")
    cart_items = relationship("CartItemModel", back_populates="product", foreign_keys=[CartItemModel.variant_id])
    
class UserShopAnalyticsModel(Base):
    __tablename__ = 'user_shop_analytics'
    __table_args__ = (
        Index('uq_user_shop_date', 'user_id', 'shop_id', 'date', unique=True, postgresql_where=Column('user_id').isnot(None)),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True, index=True)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False, index=True)
    date = Column(BigInteger, nullable=False, index=True)
    chat_interactions_count = Column(Integer, default=0, nullable=False)
    opened_chatbot_count = Column(Integer, default=0, nullable=False)
    added_to_cart_count = Column(Integer, default=0, nullable=False)
    purchased_count = Column(Integer, default=0, nullable=False)
    purchase_amount = Column(Float, default=0.0, nullable=False)

    user = relationship("UserModel", back_populates="analytics")
    shop = relationship("ShopModel")
    minutely_data = relationship("UserShopMinutelyAnalyticsModel", back_populates="daily_analytics", cascade="all, delete-orphan")

class UserShopMinutelyAnalyticsModel(Base):
    __tablename__ = 'user_shop_minutely_analytics'
    __table_args__ = (
        Index('uq_analytics_id_minute_timestamp', 'analytics_id', 'minute_timestamp', unique=True),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    analytics_id = Column(Integer, ForeignKey('user_shop_analytics.id', ondelete="CASCADE"), nullable=False, index=True)
    minute_timestamp = Column(BigInteger, nullable=False, index=True)

    chat_interactions_count = Column(Integer, default=0, nullable=False)
    opened_chatbot_count = Column(Integer, default=0, nullable=False)
    added_to_cart_count = Column(Integer, default=0, nullable=False)
    purchased_count = Column(Integer, default=0, nullable=False)
    purchase_amount = Column(Float, default=0.0, nullable=False)

    daily_analytics = relationship("UserShopAnalyticsModel", back_populates="minutely_data")

class IntegrationModel(Base):
    __tablename__ = 'integrations'

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)

    shop = relationship("ShopModel", back_populates="integrations")

class OfferModel(Base):
    __tablename__ = 'offers'
    __table_args__ = (
        UniqueConstraint('tag', 'product_id', name='_tag_product_uc'),
        {'sqlite_autoincrement': True, 'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    tag = Column(String, nullable=False)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    product_id = Column(BigInteger, ForeignKey('products.id'), nullable=False)

    shop = relationship("ShopModel", back_populates="offers")
    product = relationship("ProductModel", back_populates="offers")

class ShopMetadataModel(Base):
    __tablename__ = "shop_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, unique=True)
    namespace = Column(String(255), nullable=False)
    config_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    shop = relationship("ShopModel", back_populates="shop_metadata")
from sqlalchemy import UniqueConstraint, BigInteger, Text
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Text, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from app.models.db.base import Base

class OrderModel(Base):
    __tablename__ = 'orders'
    __table_args__ = (
        UniqueConstraint('shop_id', 'shopify_order_id', name='_shop_shopify_order_uc'),
    )

    id = Column(Integer, primary_key=True)
    shopify_order_id = Column(BigInteger, nullable=False, index=True)
    total_price = Column(Float, nullable=False)
    customer_name = Column(String, nullable=True)
    customer_email = Column(String, nullable=False, index=True)
    shipping_address = Column(Text, nullable=True)
    phone_number = Column(String, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    shop_id = Column(Integer, ForeignKey('shops.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    shop = relationship("ShopModel", back_populates="orders")
    user = relationship("UserModel", back_populates="orders")
    order_items = relationship("OrderItemModel", back_populates="order", cascade="all, delete-orphan")

class OrderItemModel(Base):
    __tablename__ = 'order_items'
    
    id = Column(Integer, primary_key=True)
    quantity = Column(Integer, nullable=False)
    price_per_item = Column(Float, nullable=False)
    product_title = Column(String, nullable=False)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    product_id = Column(BigInteger, ForeignKey('products.id'), nullable=True)    
    created_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    order = relationship("OrderModel", back_populates="order_items")
    product = relationship("ProductModel", back_populates="order_items")
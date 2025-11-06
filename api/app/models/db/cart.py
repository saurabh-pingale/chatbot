from sqlalchemy import Column, Integer, BigInteger, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.db.base import Base

class CartItemModel(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False, index=True)
    variant_id = Column(BigInteger, ForeignKey("products.variant_id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("UserModel", back_populates="cart_items")
    shop = relationship("ShopModel", back_populates="cart_items")
    product = relationship("ProductModel", back_populates="cart_items")

    __table_args__ = (UniqueConstraint('user_id', 'shop_id', 'variant_id', name='uq_user_shop_variant'),)
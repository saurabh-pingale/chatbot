from sqlalchemy import Column, Integer, ForeignKey, DateTime, BigInteger, CheckConstraint, String, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.db.base import Base

class CheckoutProductModel(Base):
    __tablename__ = "checkout_products"
    __table_args__ = (
        CheckConstraint(
            '(user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL)',
            name='check_user_or_guest_checkout'
        ),
        UniqueConstraint('shop_id', 'variant_id', 'user_id', name='uq_user_product_in_cart'),
        UniqueConstraint('shop_id', 'variant_id', 'guest_id', name='uq_guest_product_in_cart'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_count = Column(Integer)
    variant_id = Column(BigInteger, ForeignKey("products.variant_id"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    guest_id = Column(String(255), nullable=True, index=True)
    shop_id = Column(Integer, ForeignKey("shops.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("ProductModel", back_populates="checkout_products", primaryjoin="ProductModel.variant_id==CheckoutProductModel.variant_id" )
    collection = relationship("CollectionModel", back_populates="checkout_products")
    user = relationship("UserModel", back_populates="checkout_products")
    shop = relationship("ShopModel", back_populates="checkout_products")

from sqlalchemy import Column, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.models.db.base import Base

class CheckoutProductModel(Base):
    __tablename__ = "checkout_products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_count = Column(Integer)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=False)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("ProductModel", back_populates="checkout_products")
    collection = relationship("CollectionModel", back_populates="checkout_products")
    user = relationship("UserModel", back_populates="checkout_products")
    store = relationship("StoreModel", back_populates="checkout_products")

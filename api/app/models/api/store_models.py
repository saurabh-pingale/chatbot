from sqlalchemy import create_engine, Column, String, Integer, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

Base = declarative_base()

class Data(Base):
    __tablename__ = 'data'
    
    shop_id = Column(String, primary_key=True)
    color = Column(String)

class Collection(Base):
    __tablename__ = 'collections'
    
    id = Column(Integer, primary_key=True)
    title = Column(String, unique=True)
    products_count = Column(Integer)
    
    products = relationship("Product", back_populates="collection")

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    title = Column(String)
    description = Column(String)
    category = Column(String)
    url = Column(String)
    price = Column(Float)
    image = Column(String)
    collection_id = Column(Integer, ForeignKey('collections.id'))
    
    collection = relationship("Collection", back_populates="products")
    
    __table_args__ = (
        {'sqlite_autoincrement': True},
        {'unique_constraint': ['title', 'category']}
    )
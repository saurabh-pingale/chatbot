from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint

Base = declarative_base()

#TODO - change naming of the file, is it related store_admin or rag-pipeline
class Data(Base):
    __tablename__ = 'data'
    
    shop_id = Column(String, primary_key=True)
    color = Column(String)

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
    
class ChatbotAnalytics(Base):
    __tablename__ = 'chatbot_analytics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    store_id = Column(String, ForeignKey('users.id'))  
    email = Column(String)
    country = Column(String)
    region = Column(String)
    city = Column(String)
    ip = Column(String)
    chat_interactions = Column(Integer, default=0)
    first_interaction = Column(DateTime)
    last_interaction = Column(DateTime)
    products_added_to_cart = Column(Integer, default=0)
    products_purchased = Column(Integer, default=0)
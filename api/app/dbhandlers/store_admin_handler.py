from typing import Optional, List, Dict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.models.db.store_admin import Base, Data, DBCollection, DBProduct, ChatbotAnalytics
from app.models.api.store_admin import (Collection as CollectionModel, ProductRequest)
from app.config import DATABASE_URL
from app.utils.logger import logger

class StoreAdminHandler:
    def __init__(self):
        database_url = DATABASE_URL

        if not database_url:
            raise ValueError("Database URL must be provided in the environment variables.")

        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)

        Base.metadata.create_all(self.engine)

    async def get_color_preference(self, shop_id: str) -> Optional[str]:
        """Fetches color preference for a given shop ID."""
        session = self.Session()
        try:
            data = session.query(Data).filter_by(shop_id=shop_id).first()
            if not data:
                print(f"No color preference found for shop: {shop_id}, returning default")
                return None
            return data.color
        except SQLAlchemyError as error:
            session.rollback()
            logger.error("Database error in get_color_preference: %s", str(error), exc_info=True)

            raise error
        finally:
            session.close()

    async def store_collections(self, collections: List[CollectionModel]) -> List[dict]:
        """Stores collections in the database."""
        session = self.Session()
        try:
            result = []
            for collection in collections:
                db_collection = session.merge(
                    DBCollection(
                        title=collection.title,
                        products_count=collection.products_count
                    )
                )
                result.append({
                    "title": db_collection.title,
                    "products_count": db_collection.products_count,
                    "id": db_collection.id
                })
            session.commit()
            return result
        except SQLAlchemyError as error:
            session.rollback()
            logger.error("Database error in store_collections: %s", str(error), exc_info=True)
            raise error
        finally:
            session.close()

    async def store_products(self, products: List[ProductRequest], collection_id_map: Dict[str, int]) -> None:
        """Stores products in the database and links them to collections."""
        session = self.Session()
        try:
            for product in products:
                col_id = collection_id_map.get(product.category)
                session.merge(
                    DBProduct(
                        title= product.title,
                        description= product.description,
                        category= product.category,
                        url= product.url,
                        price= float(product.price) if product.price else None,
                        image= product.image,
                        collection_id= col_id if col_id else None
                    )
                )
                session.commit
        except Exception as error:
            session.rollback()
            logger.error("Supabase error in store_products: %s", str(error), exc_info=True)
            raise error
        finally:
            session.close()

    async def store_session_data(self, session_data: Dict) -> bool:
        """Stores chatbot session analytics data"""
        session = self.Session()
        try:
            analytics_record = ChatbotAnalytics(
                store_id=session_data.get('store_id'),
                email=session_data.get('email'),
                country=session_data.get('location', {}).get('country'),
                region=session_data.get('location', {}).get('region'),
                city=session_data.get('location', {}).get('city'),
                ip=session_data.get('ip'),
                chat_interactions=session_data.get('total_chat_interactions', 0),
                first_interaction=session_data.get('first_interaction'),
                last_interaction=session_data.get('session_end'),
                products_added_to_cart=session_data.get('total_products_added_to_cart', 0),
                products_purchased=session_data.get('total_products_purchased', 0)
            )
            session.add(analytics_record)
            session.commit()
            return True
        except SQLAlchemyError as error:
            session.rollback()
            logger.error("Database error in store_session_data: %s", str(error), exc_info=True)
            return False
        finally:
            session.close()

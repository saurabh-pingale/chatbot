from typing import Optional, List, Dict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.models.db.store_admin import Base, DBStore, DBCollection, ProductModel
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
            store = session.query(DBStore).filter_by(id=shop_id).first()
            if not store:
                print(f"No color preference found for shop: {shop_id}, returning default")
                return None
            return store.preferred_color
        except SQLAlchemyError as error:
            session.rollback()
            logger.error("Database error in get_color_preference: %s", str(error), exc_info=True)

            raise error
        finally:
            session.close()

    async def store_collections(self, collections: List[CollectionModel]) -> List[dict]:
        """Stores collections in the database using bulk operations."""
        session = self.Session()
        try:
            result = []
    
            titles = [c.title for c in collections]
            existing_collections = session.query(DBCollection).filter(DBCollection.title.in_(titles)).all()
            existing_map = {c.title: c for c in existing_collections}

            to_insert = []
            for collection in collections:
                if collection.title in existing_map:
                    existing_map[collection.title].products_count = collection.products_count
                    result.append({
                        "title": collection.title,
                        "products_count": collection.products_count,
                        "id": existing_map[collection.title].id
                    })
                else:
                    new_collection = DBCollection(
                        title=collection.title,
                        products_count=collection.products_count
                    )
                    to_insert.append(new_collection)

            if to_insert:
                session.bulk_save_objects(to_insert)
                session.flush()

                for obj in to_insert:
                    result.append({
                        "title": obj.title,
                        "products_count": obj.products_count,
                        "id": obj.id
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
        """Stores products in the database and links them to collections using bulk insert."""
        session = self.Session()
        try:
            product_objs = []
    
            for product in products:
                col_id = collection_id_map.get(product.category)
                product_obj = DBProduct(
                    title=product.title,
                    description=product.description,
                    category=product.category,
                    url=product.url,
                    price=float(product.price) if product.price else None,
                    image=product.image,
                    collection_id=col_id if col_id else None
                )
                product_objs.append(product_obj)
    
            session.bulk_save_objects(product_objs)
            session.commit()
    
        except Exception as error:
            session.rollback()
            logger.error("Supabase error in store_products: %s", str(error), exc_info=True)
            raise error
        finally:
            session.close()

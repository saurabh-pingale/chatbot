#TODO: This is not the proper way, you should do as raise Exception('...')
from typing import Optional, List, Dict
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, join
from sqlalchemy.dialects.postgresql import insert

from app.models.db.shop_admin import ProductModel, ShopModel, CollectionModel, IntegrationModel
from app.models.api.shop_admin import (ProductRequest)
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class ShopAdminHandler:
    def __init__(self):
        pass

    async def get_shop_by_domain(self, shop_domain: str) -> Optional[ShopModel]:
        """Fetches a shop by its domain."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(
                        select(ShopModel).filter(ShopModel.shop_id == shop_domain)
                    )
                    return result.scalars().first()
                except SQLAlchemyError as error:
                    logger.error("Database error in get_shop_by_domain: %s", str(error), exc_info=True)
                    #TODO: This is not the proper way, you should do as raise Exception('...')
                    raise error

    async def create_collections(self, collections: List[CollectionModel]) -> List[dict]:
        """Create collections in the database using bulk operations."""
        #TODO: Where did you defined rollback ?
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    created_collections_info  = []
                    collection_data_to_insert = []
                    
                    for collection in collections:
                        #TODO: Add validation if title and products_count exists
                        collection_data_to_insert.append({
                            'title': collection.title,
                            'products_count': collection.products_count
                        })

                    stmt = insert(CollectionModel).values(collection_data_to_insert)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['title'],  
                        set_={'products_count': stmt.excluded.products_count}
                    )

                    await session.execute(stmt)
                    #TODO: Don't use c['title'], always use c.get('title', '') if more safer one
                    #TODO: Don't use "c", "b" or "d", define properly
                    titles = [c['title'] for c in collection_data_to_insert]
                    stmt = select(CollectionModel).where(CollectionModel.title.in_(titles))
                    existing_collections = await session.execute(stmt)
                    collections_list = existing_collections.scalars().all()

                    for collection in collections_list:
                        #TODO: Don't use collection. (colllection dot title), use collection.get('title', ''), its safer won't get errors and has fallback
                        created_collections_info.append({
                            "title": collection.title,
                            "products_count": collection.products_count,
                            "id": collection.id
                        })

                    return created_collections_info 

                except SQLAlchemyError as error:
                    logger.error("Database error in create_collections: %s", str(error), exc_info=True)
                    raise error
                
    async def get_collections(self, shop_id: str) -> List[str]:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(CollectionModel.title)
                .select_from(
                    join(CollectionModel, ProductModel, CollectionModel.id == ProductModel.collection_id)
                )
                .join(ShopModel, ProductModel.shop_id == ShopModel.id)
                .where(ShopModel.shop_id == shop_id)
                .distinct()
            )
            result = await session.execute(stmt)
            #Here also if result doesn't have items then it causes issue, make sure validate if row contains items
            return [row[0] for row in result.all() if row[0]]

    async def create_products(self, products: List[ProductRequest], collection_id_map: Dict[str, int], shop_id: int) -> None:
        """Create products in the database and links them to collections using bulk insert."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    product_data_to_insert = []
                    for product in products:
                        col_id = collection_id_map.get(product.category)
                        #TODO: Here also don't use ., instead use get like product.get('id')
                        product_data_to_insert.append({
                            'id': product.id,
                            'title': product.title,
                            'description': product.description,
                            'category': product.category,
                            'url': product.url,
                            'price': float(product.price) if product.price else None,
                            'image': product.image,
                            'collection_id': col_id if col_id else None,
                            'shop_id': shop_id
                        })

                    stmt = insert(ProductModel).values(product_data_to_insert)

                    stmt = stmt.on_conflict_do_update(
                        index_elements=['id'], 
                        set_={
                            'title': stmt.excluded.title,
                            'description': stmt.excluded.description,
                            'category': stmt.excluded.category,
                            'url': stmt.excluded.url,
                            'price': stmt.excluded.price,
                            'image': stmt.excluded.image,
                            'collection_id': stmt.excluded.collection_id
                        }
                    )

                    await session.execute(stmt)

                except Exception as error:
                    logger.error("Error in create_products: %s", str(error), exc_info=True)
                    raise error

    async def get_support_contact(self, shop_id: str) -> Optional[dict]:
        """Fetches support email and phone for a given shop name."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await self.get_shop_by_domain(shop_id)
                    if not shop:
                        logger.warning(f"No shop found with name: {shop_id}")
                        return None

                    #TODO: These fallback country code we need to mention in .env file, so that we can quickly change
                    #TODO: Don't use shop.support_country_code or '+1' instead use like shop.get('support_country_code', 'os.env.US_COUNTRY_CODE')
                    return {
                        "support_email": shop.support_email,
                        "support_phone": f"{shop.support_country_code or '+1'}{shop.support_phone}"
                    }
                except SQLAlchemyError as error:
                    logger.error("Database error in get_support_contact: %s", str(error), exc_info=True)
                    return None
    
    async def create_color_preference(self, shop_id: str, color: str) -> None:
        """Create the color preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await self.get_shop_by_domain(shop_id)
                    if not shop:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)

                    #TODO: What is this use of this line, are we returning anywhere ?, bro please becareful..., we good code
                    shop.preferred_color = color

                except SQLAlchemyError as error:
                    logger.error("Database error in create_color_preference: %s", str(error), exc_info=True)
                    raise error
            
    async def create_support_info(self, shop_id: str, email: str, phone: str, country_code: str) -> dict:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await self.get_shop_by_domain(shop_id)
                    if not shop:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    #TODO: What is this use of this line, are we returning anywhere ?, bro please becareful..., we good code
                    shop.support_email = email
                    shop.support_phone = phone
                    shop.support_country_code = country_code

                    return {"success": True}
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving support info: %s", str(error), exc_info=True)
                    #TODO: This is not the proper way, you should do as raise Exception('...')
                    raise

    async def create_shop_image(self, shop_id: str, image_url: str) -> dict:
        """Create the image URL for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await self.get_shop_by_domain(shop_id)
                    if not shop:
                        shop = ShopModel(shop_id=shop_id)
                        session.add(shop)
                    #TODO: What is this use of this line, are we returning anywhere ?, bro please becareful..., we good code
                    shop.image = image_url
                    return {"success": True}
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error("Error saving shop image: %s", str(error), exc_info=True)
                    return {"success": False}

    async def get_shop_status(self, shop_id: str) -> Optional[ShopModel]:
        """Fetches a shop by its ID to check its status."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await self.get_shop_by_domain(shop_id)
                    #TODO: Validate here if there is no shop, raise exception error
                    return shop
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_shop_by_id for shop {shop_id}: {error}", exc_info=True)
                    #TODO: This is not the proper way, you should do as raise Exception('...')
                    raise error
                
    async def create_email_gate_preference(self, shop_id: str, show_email_gate: bool) -> None:
        """Create the email gate preference for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await self.get_shop_by_domain(shop_id)
                    if not shop:
                        shop = ShopModel(shop_id=shop_id, show_email_gate=show_email_gate)
                        session.add(shop)
                        logger.info(f"New shop created with shop_id {shop_id} and email gate preference {show_email_gate}")
                    else:
                        shop.show_email_gate = show_email_gate
                        logger.info(f"Updated email gate preference for shop_id {shop_id} to {show_email_gate}")
         
                except SQLAlchemyError as error:
                    logger.error(f"Database error in create_email_gate_preference for shop {shop_id}: {error}", exc_info=True)
                    #TODO: This is not the proper way, you should do as raise Exception('...')
                    raise error
                
    async def create_integration(self, shop_id: str, title: str, description: str) -> None:
        """Create integration details for a given shop ID."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    integration = IntegrationModel(
                        shop_id=shop_id,
                        title=title,
                        description=description
                    )
                    session.add(integration)
                except SQLAlchemyError as error:
                    logger.error(f"Database error in save_integration for shop {shop_id}: {error}", exc_info=True)
                    #TODO: This is not the proper way, you should do as raise Exception('...')
                    raise error
                
    async def update_shop_setup_completed_status(self, shop_id: int, status: bool) -> None:
        """Updates the setup_completed status for a given shop."""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    shop = await session.get(ShopModel, shop_id)
                    if shop:
                        shop.setup_completed = status
                        logger.info(f"Updated setup_completed status for shop_id {shop_id} to {status}")
                except SQLAlchemyError as e:
                    logger.error(f"Database error in update_shop_setup_completed_status for shop {shop_id}: {e}", exc_info=True)
                    #TODO: This is not the proper way, you should do as raise Exception('...')
                    raise
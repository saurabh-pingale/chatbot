from typing import List, Dict
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select, delete

from app.models.db.country_code import CountryCodeModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class CountryCodeHandler:
    async def get_country_codes(self) -> List[Dict[str, str]]:
        """Get all country codes"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    result = await session.execute(select(CountryCodeModel))
                    country_codes = result.scalars().all()
                    return [{"label": cc.label, "value": cc.value} for cc in country_codes]
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_country_codes: {error}", exc_info=True)
                    raise

    async def store_country_codes(self, country_codes: List[Dict[str, str]]) -> bool:
        """Store country codes in bulk"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    await session.execute(delete(CountryCodeModel))
                    
                    for code in country_codes:
                        session.add(CountryCodeModel(
                            label=code['label'],
                            value=code['value']
                        ))
                    
                    await session.commit()
                    return True
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error(f"Database error in store_country_codes: {error}", exc_info=True)
                    raise
                except KeyError as error:
                    await session.rollback()
                    logger.error(f"Invalid country code format: {error}", exc_info=True)
                    raise ValueError("Each country code must have 'label' and 'value' fields")
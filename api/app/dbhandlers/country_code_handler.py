from typing import List, Dict
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.models.db.country_code import CountryCodeModel
from app.dbhandlers.db import AsyncSessionLocal
from app.utils.logger import logger

class CountryCodeHandler:
    async def get_country_codes(self) -> List[Dict[str, str]]:
        """Get all country codes"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    query_result = await session.execute(select(CountryCodeModel))
                    country_codes = query_result.scalars().all()

                    country_code_list = [
                        {"label": country.label, "value": country.value}
                        for country in country_codes
                    ]

                    return country_code_list
                except SQLAlchemyError as error:
                    logger.error(f"Database error in get_country_codes: {error}", exc_info=True)
                    raise Exception("Failed to fetch country codes from the database.")
    
    async def create_country_codes(self, country_codes: List[Dict[str, str]]) -> bool:
        """Create country codes in bulk"""
        async with AsyncSessionLocal() as session:
            async with session.begin():
                try:
                    country_code_objs = [
                        CountryCodeModel(label=code['label'], value=code['value'])
                        for code in country_codes
                    ]

                    session.add_all(country_code_objs)
                    
                    await session.commit()
                    return True
                except SQLAlchemyError as error:
                    await session.rollback()
                    logger.error(f"Database error in create_country_codes: {error}", exc_info=True)
                    raise Exception("Failed to create country codes in the database.")
                except KeyError as error:
                    await session.rollback()
                    logger.error(f"Invalid country code format: {error}", exc_info=True)
                    raise ValueError("Each country code must have 'label' and 'value' fields")
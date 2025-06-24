from typing import List, Dict

from app.dbhandlers.country_code_handler import CountryCodeHandler

class CountryCodeService:
    def __init__(self):
        self.db_handler = CountryCodeHandler()

    async def get_country_codes(self) -> List[Dict[str, str]]:
        """ Get all country codes """
        return await self.db_handler.get_country_codes()

    async def store_country_codes(self, country_codes: List[Dict[str, str]]) -> bool:
        """ Store country codes in bulk """
        return await self.db_handler.store_country_codes(country_codes)
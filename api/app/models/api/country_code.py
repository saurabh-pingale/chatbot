from pydantic import BaseModel
from typing import List, Dict

class CountryCodeResponse(BaseModel):
    label: str
    value: str

class CountryCodeCreateRequest(BaseModel):
    country_codes: List[Dict[str, str]]
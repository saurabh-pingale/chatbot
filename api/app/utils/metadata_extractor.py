import re
from typing import Dict, Any
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from app.utils.metadata_config import CATEGORY_ALIASES, CATEGORY_ATTRIBUTES, ATTRIBUTE_PATTERNS

class MetadataExtractor:
    """A centralized class to extract metadata for various apparel categories."""

    def __init__(self):
        sorted_aliases = sorted(CATEGORY_ALIASES.keys(), key=len, reverse=True)
        self._category_regex = re.compile(r"\b(" + "|".join(sorted_aliases) + r")\b", re.IGNORECASE)
        self._size_map = {
            "extra small": "XS", "small": "S", "medium": "M", "large": "L", "extra large": "XL",
            "xxl": "XXL", "xxxl": "XXXL"
        }

    def extract_all_metadata(self, query: str) -> Dict[str, Any]:
        """
        Extracts all products and their attributes from a query.
        Handles multiple product descriptions in a single query.
        """
        # normalized_query = query.lower()
        # normalized_query = re.sub(r"\btshirt(s)?\b", r"t-shirt\1", normalized_query)
        # normalized_query = re.sub(r"\btee shirt(s)?\b", r"t-shirt\1", normalized_query)
        # normalized_query = re.sub(r"\bjean(s)?\b", r"jeans", normalized_query) 
        # normalized_query = re.sub(r"\bkurti(s)?\b", r"kurta\1", normalized_query)
    
        category_matches = list(self._category_regex.finditer(query))

        if not category_matches:
            return self._extract_title(query)

        combined_metadata = defaultdict(list)
        
        for i, current_match in enumerate(category_matches):
            #TODO: Move these things to seperate module 
            start_pos = category_matches[i-1].end() if i > 0 else 0
            end_pos = category_matches[i+1].start() if i < len(category_matches) - 1 else len(query)

            segment = query[start_pos:end_pos]
            
            alias = current_match.group(1).lower()
            category = CATEGORY_ALIASES.get(alias)
            if category and category not in combined_metadata["category"]:
                 combined_metadata["category"].append(category)

            attributes_to_find = CATEGORY_ATTRIBUTES.get(category, [])
            for attr in attributes_to_find:
                if attr == "category":
                    continue
                
                extractor_method = getattr(self, f"_extract_{attr}", None)
                if extractor_method:
                    attr_value = extractor_method(segment)
                    if attr_value:
                        for key, val in attr_value.items():
                            if val not in combined_metadata[key]:
                                combined_metadata[key].append(val)
        
        final_metadata = {}
        for key, value in combined_metadata.items():
            if len(value) == 1:
                val = value[0]
                final_metadata[key] = val.lower() if isinstance(val, str) else val
            else:
                final_metadata[key] = [
                    v.lower() if isinstance(v, str) else v for v in value
                ]

        return final_metadata

    def _extract_price(self, query: str) -> Dict[str, Any]:
        """Extracts exact or conditional price."""
        exact_match = ATTRIBUTE_PATTERNS["price"]["exact"].search(query)
        if exact_match:
            price = int(Decimal(exact_match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))
            return {"price": price}
        
        range_match = ATTRIBUTE_PATTERNS["price"]["range"].search(query)
        if range_match:
            lower = int(Decimal(range_match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))
            upper = int(Decimal(range_match.group(2)).to_integral_value(rounding=ROUND_HALF_UP))
            return {"price": {"$gte": lower, "$lte": upper}}

        under_match = ATTRIBUTE_PATTERNS["price"]["under"].search(query)
        if under_match:
            return {"price": {"$lte": int(Decimal(under_match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))}}

        over_match = ATTRIBUTE_PATTERNS["price"]["over"].search(query)
        if over_match:
            return {"price": {"$gte": int(Decimal(over_match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))}}
        
        return {}

    def _extract_color(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["color"].search(query)
        return {"color": match.group(1).lower()} if match else {}

    def _extract_material(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["material"].search(query)
        return {"material": match.group(1).lower()} if match else {}

    def _extract_size(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["size"].search(query)
        if match:
            size_raw = match.group(1).lower()
            return {"size": self._size_map.get(size_raw, size_raw.upper())}
        return {}
    
    def _extract_title(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["title"].search(query)
        if match:
            title = match.group(1) or match.group(2)
            if title:
                cleaned = re.sub(r"\s+(in|under|for|with|on)$", "", title.strip(), flags=re.IGNORECASE)
                cleaned = re.sub(r"[?.!,]+$", "", cleaned).lower()
                return {"title": cleaned}
        return {}

    def _extract_sleeve_length(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["sleeve_length"].search(query)
        return {"sleeve_length": match.group(1).lower()} if match else {}
        
    def _extract_fit(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["fit"].search(query)
        return {"fit": match.group(1).lower()} if match else {}

    def _extract_pattern(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["pattern"].search(query)
        return {"pattern": match.group(1).lower()} if match else {}
        
    def _extract_neckline(self, query: str) -> Dict[str, str]:
        match = ATTRIBUTE_PATTERNS["neckline"].search(query)
        return {"neckline": match.group(1).lower()} if match else {}

metadata_extractor = MetadataExtractor()
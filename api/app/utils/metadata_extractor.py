import re
from typing import Dict, Any, Optional, List
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from app.utils.metadata_config import (
    CATEGORY_ALIASES as FALLBACK_ALIASES,
    CATEGORY_ATTRIBUTES as FALLBACK_ATTRIBUTES,
    ATTRIBUTE_PATTERNS as FALLBACK_PATTERNS,
    SIZE_ALIASES, 
    COMMON_ATTRIBUTES
)

class MetadataExtractor:
    """A centralized class to extract metadata for various apparel categories."""

    def __init__(self):
        sorted_aliases = sorted(FALLBACK_ALIASES.keys(), key=len, reverse=True)
        self._category_regex = re.compile(r"\b(" + "|".join(sorted_aliases) + r")\b", re.IGNORECASE)

    def _get_segment_from_query(self, query: str, category_matches: list, current_index: int) -> str:
        """Returns the segment of the query corresponding to a product category match"""
        start_pos = category_matches[current_index - 1].end() if current_index > 0 else 0
        end_pos = category_matches[current_index + 1].start() if current_index < len(category_matches) - 1 else len(query)
        return query[start_pos:end_pos]

    def extract_all_metadata(self, query: str, dynamic_categories: Optional[List[str]], config: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Extracts all products and their attributes from a query.
        Uses dynamic config from Redis if provided, otherwise uses static fallback.
        """
        category_regex = None

        if config:
            category_aliases = config.get("category_aliases", FALLBACK_ALIASES).copy()
            category_attributes = config.get("category_attributes", FALLBACK_ATTRIBUTES).copy()
            attribute_patterns = config.get("attribute_patterns", FALLBACK_PATTERNS)
        else:
            category_aliases = FALLBACK_ALIASES.copy()
            category_attributes = FALLBACK_ATTRIBUTES.copy()
            attribute_patterns = FALLBACK_PATTERNS

        if dynamic_categories:
            for category in dynamic_categories:
                cat_lower = category.lower()
                if cat_lower not in category_aliases:
                    category_aliases[cat_lower] = cat_lower
                    if not cat_lower.endswith('s'):
                        category_aliases[f"{cat_lower}s"] = cat_lower

                if cat_lower not in category_attributes:
                    category_attributes[cat_lower] = COMMON_ATTRIBUTES

            sorted_aliases = sorted(category_aliases.keys(), key=len, reverse=True)
            category_regex = re.compile(r"\b(" + "|".join(re.escape(alias) for alias in sorted_aliases) + r")\b", re.IGNORECASE)

        if category_regex:
            category_matches = list(category_regex.finditer(query))
        else:
            category_matches = []

        if not category_matches:
            return self._extract_title(query, attribute_patterns)

        combined_metadata = defaultdict(list)
        
        for i, current_match in enumerate(category_matches):
            segment = self._get_segment_from_query(query, category_matches, i)
            
            alias = current_match.group(1).lower()
            category = category_aliases.get(alias)
            if category and category not in combined_metadata["category"]:
                 combined_metadata["category"].append(category)

            attributes_to_find = category_attributes.get(category, [])
            for attr in attributes_to_find:
                if attr == "category":
                    continue
                
                extractor_method = getattr(self, f"_extract_{attr}", None)
                if extractor_method:
                    attr_value = extractor_method(segment, attribute_patterns)
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

    def _extract_price(self, query: str, patterns: Dict) -> Dict[str, Any]:
        """Extracts exact or conditional price."""
        pattern_set = patterns.get("price", {})

        if not isinstance(pattern_set, dict):
            match = pattern_set.search(query)
            if match:
                try:
                    price_str = match.group(1) if pattern_set.groups > 0 else match.group(0)
                    price = int(Decimal(price_str).to_integral_value(rounding=ROUND_HALF_UP))
                    return {"price": price}
                except (IndexError, ValueError):
                    return {}
            return {}
        
        for key, pattern in pattern_set.items():
            match = pattern.search(query)
            if not match: continue
            
            if key == "exact":
                price = int(Decimal(match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))
                return {"price": price}
        
            if key == "range":
                lower = int(Decimal(match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))
                upper = int(Decimal(match.group(2)).to_integral_value(rounding=ROUND_HALF_UP))
                return {"price": {"$gte": lower, "$lte": upper}}

            if key == "under":
                return {"price": {"$lte": int(Decimal(match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))}}

            if key == "over":
                return {"price": {"$gte": int(Decimal(match.group(1)).to_integral_value(rounding=ROUND_HALF_UP))}}
        
        return {}
    
    def _extract_single_attribute(self, query: str, patterns: Dict, attr_name: str) -> Dict[str, str]:
        """ Extractor for attributes that expect a single value."""
        pattern = patterns.get(attr_name)
        if not pattern: return {}
        
        match = pattern.search(query)
        if match:
            value = match.group(1) if pattern.groups >= 1 else match.group(0)
            return {attr_name: value.lower()}
        return {}

    def _extract_color(self, query: str, patterns: Dict) -> Dict[str, str]:
        return self._extract_single_attribute(query, patterns, "color")

    def _extract_fabric(self, query: str, patterns: Dict) -> Dict[str, str]:
        return self._extract_single_attribute(query, patterns, "fabric")

    def _extract_size(self, query: str, patterns: Dict) -> Dict[str, str]:
        pattern = patterns.get("size")
        if not pattern: return {}

        match = pattern.search(query)
        if match:
            size_raw = (match.group(1) if pattern.groups >= 1 else match.group(0)).lower()
            return {"size": SIZE_ALIASES.get(size_raw, size_raw.upper())}
        return {}
    
    def _extract_title(self, query: str, patterns: Dict) -> Dict[str, str]:
        pattern = patterns.get("title")
        if not pattern: return {}

        match = pattern.search(query)
        if match:
            title = None
            if match.groups():
                title = next((g for g in reversed(match.groups()) if g is not None), None)
            
            if title:
                cleaned = re.sub(r"\s+(in|under|for|with|on)$", "", title.strip(), flags=re.IGNORECASE)
                cleaned = re.sub(r"[?.!,]+$", "", cleaned).lower()
                return {"title": cleaned}
        return {}

    def _extract_sleeve_length(self, query: str, patterns: Dict) -> Dict[str, str]:
        return self._extract_single_attribute(query, patterns, "sleeve_length")
        
    def _extract_fit(self, query: str, patterns: Dict) -> Dict[str, str]:
        return self._extract_single_attribute(query, patterns, "fit")

    def _extract_pattern(self, query: str, patterns: Dict) -> Dict[str, str]:
        return self._extract_single_attribute(query, patterns, "pattern")
        
    def _extract_neckline(self, query: str, patterns: Dict) -> Dict[str, str]:
        return self._extract_single_attribute(query, patterns, "neckline")
    
    def _extract_gender(self, query: str, patterns: Dict) -> Dict[str, str]:
        pattern = patterns.get("gender")
        if not pattern: return {}

        match = pattern.search(query)
        if not match:
            return {}

        val = (match.group(1) if pattern.groups >= 1 else match.group(0)).lower()
        if val in ["men", "man", "male", "boys", "boyfriend", "husband"]:
            return {"gender": "male"}
        elif val in ["women", "woman", "female", "ladies", "girls", "girlfriend", "wife"]:
            return {"gender": "female"}
        elif val in ["unisex", "all genders", "both genders", "male and female", "for everyone"]:
            return {"gender": "unisex"}

        return {}

metadata_extractor = MetadataExtractor()
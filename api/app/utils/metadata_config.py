import re

ATTRIBUTE_PATTERNS = {
    "price": {
        "exact": re.compile(r"(?:costs?|price(?:d)? at|worth)\s*₹?\s?(\d{2,6}(?:\.\d{1,2})?)", re.IGNORECASE),
        "range": re.compile(r"(?:between|from)?\s*\₹?\s*(\d{2,6})\s*(?:to|and|-)\s*\₹?\s*(\d{2,6})", re.IGNORECASE),
        "under": re.compile(r"(?:under|below|less than)\s*\₹?\s*(\d{2,6})", re.IGNORECASE),
        "over": re.compile(r"(?:above|over|more than)\s*\₹?\s*(\d{2,6})", re.IGNORECASE)
    },
    "color": re.compile(r"\b(black|white|red|blue|green|yellow|pink|purple|orange|grey|gray|brown|beige|navy|maroon|olive|teal|gold|silver)\b", re.IGNORECASE),
    "size": re.compile(r"\b(XS|S|M|L|XL|XXL|XXXL|extra small|small|medium|large|extra large)\b", re.IGNORECASE),
    "material": re.compile(r"\b(cotton|linen|silk|polyester|rayon|nylon|denim|wool|khadi|fleece|spandex|viscose|leather)\b", re.IGNORECASE),
    "sleeve_length": re.compile(r"\b(full sleeve|long sleeve|half sleeve|short sleeve|sleeveless|3/4 sleeve)\b", re.IGNORECASE),
    "fit": re.compile(r"\b(slim fit|regular fit|skinny fit|relaxed fit|loose fit|athletic fit|bootcut)\b", re.IGNORECASE),
    "pattern": re.compile(r"\b(striped|checked|checkered|solid|plain|printed|floral|geometric|dotted)\b", re.IGNORECASE),
    "neckline": re.compile(r"\b(round neck|v-neck|crew neck|polo|turtleneck|henley|scoop neck)\b", re.IGNORECASE),
    "title": re.compile(r"(?:called|named)\s+['\"]?([\w\-’'\s]{2,80})['\"]?(?=\b|[?.!,])|\"([\w\-’'\s]{2,80})\"", re.IGNORECASE),
}

CATEGORY_ALIASES = {
    "shirts": "shirts", "shirt": "shirts", "formal shirt": "shirts", "casual shirt": "shirts",
    "t-shirts": "t-shirts", "t-shirt": "t-shirts", "tee": "t-shirts", "tees": "t-shirts", "polo shirt": "t-shirts",
    "jeans": "jeans", "denims": "jeans",
    "trousers": "trousers", "pants": "trousers", "chinos": "trousers", "khakis": "trousers",
    "dress": "dresses", "dresses": "dresses", "gown": "dresses",
    "jacket": "jackets", "jackets": "jackets", "blazer": "jackets", "coat": "jackets",
    "kurta": "kurtas", "kurtas": "kurtas", "kurti": "kurtas",
    "hoodie": "hoodies", "hoodies": "hoodies",
    "shorts": "shorts",
    "cap": "caps", "caps": "caps", "hat": "caps",
    "footwear": "footwear", "shoes": "footwear", "shoe": "footwear", "sneakers": "footwear",
    "sandals": "footwear", "boots": "footwear", "heels": "footwear",
}

CATEGORY_ATTRIBUTES = {
    "shirts": ["price", "color", "size", "material", "sleeve_length", "fit", "pattern", "title"],
    "t-shirts": ["price", "color", "size", "material", "sleeve_length", "neckline", "pattern", "title"],
    "jeans": ["price", "color", "size", "material", "fit", "title"],
    "trousers": ["price", "color", "size", "material", "fit", "title"],
    "dresses": ["price", "color", "size", "material", "sleeve_length", "pattern", "title"],
    "jackets": ["price", "color", "size", "material", "title"],
    "kurtas": ["price", "color", "size", "material", "sleeve_length", "pattern", "title"],
    "hoodies": ["price", "color", "size", "material", "title"],
    "shorts": ["price", "color", "size", "material", "title"],
    "caps": ["price", "color", "material", "title"],
    "footwear": ["price", "color", "size", "material", "title"],
}
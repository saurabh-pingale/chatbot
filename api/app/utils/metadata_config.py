import re

COMMON_ATTRIBUTES = ["price", "color", "title"]

ATTRIBUTE_PATTERNS = {
    "price": {
        "exact": re.compile(r"(?:costs?|price(?:d)? at|worth)\s*₹?\s?(\d{2,6}(?:\.\d{1,2})?)", re.IGNORECASE),
        "range": re.compile(r"(?:between|from)?\s*\₹?\s*(\d{2,6})\s*(?:to|and|-)\s*\₹?\s*(\d{2,6})", re.IGNORECASE),
        "under": re.compile(r"(?:under|below|less than)\s*\₹?\s*(\d{2,6})", re.IGNORECASE),
        "over": re.compile(r"(?:above|over|more than)\s*\₹?\s*(\d{2,6})", re.IGNORECASE)
    },
    "color": re.compile(r"\b(black|white|red|blue|green|yellow|pink|purple|orange|grey|gray|brown|beige|navy|maroon|olive|teal|gold|silver)\b", re.IGNORECASE),
    "size": re.compile(r"(?<!')\b(XS|S|M|L|XL|XXL|XXXL|extra small|small|medium|large|extra large)\b", re.IGNORECASE),
    "fabric": re.compile(r"\b(cotton|linen|silk|polyester|rayon|nylon|denim|wool|khadi|fleece|spandex|viscose|leather)\b", re.IGNORECASE),
    "sleeve_length": re.compile(r"\b(full sleeve|long sleeve|half sleeve|short sleeve|sleeveless|3/4 sleeve)\b", re.IGNORECASE),
    "fit": re.compile(r"\b(slim fit|regular fit|skinny fit|relaxed fit|loose fit|athletic fit|bootcut)\b", re.IGNORECASE),
    "pattern": re.compile(r"\b(striped|checked|checkered|solid|plain|printed|floral|geometric|dotted)\b", re.IGNORECASE),
    "neckline": re.compile(r"\b(round neck|v-neck|crew neck|polo|turtleneck|henley|scoop neck)\b", re.IGNORECASE),
    "title": re.compile(r"(?:called|named)\s+['\"]?([\w\-’'\s]{2,80})['\"]?(?=\b|[?.!,])|\"([\w\-’'\s]{2,80})\"", re.IGNORECASE),
    "gender": re.compile(r"\b(men|man|male|women|woman|female|ladies|girls|boys|unisex|all genders|both genders|male and female|for everyone)\b", re.IGNORECASE)
}

CATEGORY_ALIASES = {
    "shirts": "shirts", "shirt": "shirts", "formal shirt": "shirts", "casual shirt": "shirts",
    "t-shirts": "t-shirts", "t-shirt": "t-shirts", "tee": "t-shirts", "tees": "t-shirts", "polo shirt": "t-shirts", "tshirt": "t-shirts", "tshirts": "t-shirts", "tee shirt": "t-shirts",
    "pants": "pants", "trousers": "pants", "chinos": "pants", "khakis": "pants",
    "jacket": "jackets", "jackets": "jackets", "blazer": "jackets", "coat": "jackets",
    "shorts": "shorts",
    "hats": "hats", "hat": "hats", "caps": "hats", "cap": "hats",
    "shoes": "shoes", "shoe": "shoes", "footwear": "shoes", "sneakers": "shoes",
    "makeup": "makeup", "make-up": "makeup", "cosmetics": "makeup", "beauty products": "makeup",
    "dresses": "dresses", "dress": "dresses", "gown": "dresses", "frock": "dresses",
}

CATEGORY_ATTRIBUTES = {
    "shirts": ["price", "color", "size", "fabric", "sleeve_length", "gender", "fit", "pattern", "title"],
    "t-shirts": ["price", "color", "size", "fabric", "sleeve_length", "gender", "neckline", "pattern", "title"],
    "pants": ["price", "color", "size", "fabric", "fit", "gender", "title"],
    "jackets": ["price", "color", "size", "fabric", "gender", "title"],
    "shorts": ["price", "color", "size", "fabric", "gender", "title"],
    "hats": ["price", "color", "fabric", "gender", "title"],
    "shoes": ["price", "color", "size", "fabric", "gender", "title"],
    "makeup": ["price", "title"],
    "dresses": ["price", "color", "size", "fabric", "gender", "title"],
}

SIZE_ALIASES = {
    "extra small": "XS",
    "small": "S",
    "medium": "M",
    "large": "L",
    "extra large": "XL",
    "xxl": "XXL",
    "xxxl": "XXXL"
}
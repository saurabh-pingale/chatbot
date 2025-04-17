from collections import OrderedDict
from typing import Any

class LRUCache:
    def __init__(self, capacity: int):
        """Initialize the cache with a given capacity."""
        self.cache = OrderedDict()
        self.capacity = capacity

    def get(self, key: str) -> Any:
        """Retrieve an item from the cache."""
        if key in self.cache:
            # Move the accessed item to the end (most recently used)
            self.cache.move_to_end(key)
            return self.cache[key]
        return None

    def put(self, key: str, value: Any):
        """Put an item into the cache."""
        if key in self.cache:
            # Remove the old value (to update it)
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            # Pop the first item (least recently used)
            self.cache.popitem(last=False)

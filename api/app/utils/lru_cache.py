import json
from typing import Any
from redis.asyncio import Redis
from app.external_service.redis_client import get_redis_client

class AsyncRedisLRUCache:
    def __init__(self, capacity: int, redis_client: Redis):
        self.capacity = capacity
        self.client = redis_client
        self.key_prefix = "lru_cache:"
        self.order_key = self.key_prefix + "order"

    @classmethod
    async def create(cls, capacity: int) -> "AsyncRedisLRUCache":
        redis = await get_redis_client()
        return cls(capacity, redis)

    def _namespaced(self, key: str) -> str:
        return f"{self.key_prefix}data:{key}"

    async def get(self, key: str) -> Any:
        namespaced_key = self._namespaced(key)
        value = await self.client.get(namespaced_key)
        if value:
            await self.client.lrem(self.order_key, 0, key)
            await self.client.rpush(self.order_key, key)
            return json.loads(value)
        return None

    async def put(self, key: str, value: Any):
        namespaced_key = self._namespaced(key)
        await self.client.set(namespaced_key, json.dumps(value))
        await self.client.lrem(self.order_key, 0, key)
        await self.client.rpush(self.order_key, key)

        current_length = await self.client.llen(self.order_key)
        if current_length > self.capacity:
            oldest = await self.client.lpop(self.order_key)
            if oldest:
                await self.client.delete(self._namespaced(oldest))
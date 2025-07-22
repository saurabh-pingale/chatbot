from redis.asyncio import Redis
from app.config import REDIS_URL

dispatcher = None

async def get_redis_client():
    global dispatcher
    if dispatcher is None:
        dispatcher = Redis.from_url(
            REDIS_URL,
            decode_responses=True,
        )
    return dispatcher
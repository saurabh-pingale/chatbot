from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL
from app.models.db.base import Base

DATABASE_URL="postgresql+asyncpg://postgres.kylkbpaiffauffwfhqmp:saurabh78@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

if not DATABASE_URL:
    raise ValueError("Database URL must be provided in the environment variables.")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
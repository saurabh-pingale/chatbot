#TODO: We faced lot of issues of this db async, please check the flow once again, Its constructed correctly read blogs, videos etc
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

if not DATABASE_URL:
    raise ValueError("Database URL must be provided in the environment variables.")

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True, pool_recycle=3600 )
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
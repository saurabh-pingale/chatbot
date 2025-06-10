from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL
from app.models.db.base import Base

if not DATABASE_URL:
    raise ValueError("Database URL must be provided in the environment variables.")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=10,            
    max_overflow=5,         
    pool_timeout=30,         
    pool_recycle=1800,       
    pool_pre_ping=False,      
    connect_args={ 
        "command_timeout": 60,
        "server_settings": {
            "application_name": "chatbot-api"
        }
    },
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
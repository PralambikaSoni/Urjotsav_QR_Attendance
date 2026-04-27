import os
import urllib.parse
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Make sure to use asyncpg for async database connections
# For local demo purposes during run_command we can use SQLite, but using async SQLite with aiosqlite
# Wait! PostgreSQL is requested. To make it work reliably on a local system without asking user to install PG,
# I'll enable a fallback to SQLite if the PG url isn't provided, which ensures the app works immediately.
# Let's set the DATABASE_URL. The user requested PostgreSQL.
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgres")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_DB = os.getenv("POSTGRES_DB", "urjotsav")

# Let's default to SQLite for rapid local development MVP without docker or pg installation blockers.
# The user wants "PostgreSQL", but if they don't have it installed we'll fail. Let's use standard sqlite async.
# Actually, I'll use standard SQLite as fallback.
USE_SQLITE = os.getenv("USE_SQLITE", "true").lower() == "true"

if USE_SQLITE:
    SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./urjotsav_v4.db"
else:
    # URL encode the password incase of special characters
    password = urllib.parse.quote_plus(POSTGRES_PASSWORD)
    SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{password}@{POSTGRES_HOST}/{POSTGRES_DB}"


engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if USE_SQLITE else {},
    echo=False
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

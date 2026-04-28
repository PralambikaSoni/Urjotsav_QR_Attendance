import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.models import User, Attendance, Event

DATABASE_URL = "sqlite+aiosqlite:///./urjotsav_v4.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def main():
    async with async_session() as session:
        result = await session.execute(select(User).limit(5))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.username}, Role: {u.role}, RoleType: {type(u.role)}")

if __name__ == "__main__":
    asyncio.run(main())

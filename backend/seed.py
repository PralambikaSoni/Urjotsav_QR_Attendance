import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import AsyncSessionLocal, engine, Base
from app import models, core

async def seed():
    # Make sure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        # Check if admin exists
        query = select(models.User).where(models.User.username == "admin")
        result = await db.execute(query)
        if not result.scalars().first():
            print("Creating Admin User...")
            admin = models.User(
                username="admin",
                full_name="System Administrator",
                email="admin@urjotsav.edu",
                role=models.RoleEnum.ADMIN,
                hashed_password=core.get_password_hash("adminpass")
            )
            db.add(admin)
            
        # Check if faculty exists
        query = select(models.User).where(models.User.username == "faculty1")
        result = await db.execute(query)
        if not result.scalars().first():
            print("Creating Demo Faculty User...")
            faculty = models.User(
                username="faculty1",
                full_name="Dr. Smith",
                email="faculty1@urjotsav.edu",
                role=models.RoleEnum.FACULTY,
                hashed_password=core.get_password_hash("facultypass")
            )
            db.add(faculty)
            
        await db.commit()
    print("Database seeded successfully! Use (admin/adminpass) or (faculty1/facultypass) to login.")

if __name__ == "__main__":
    asyncio.run(seed())

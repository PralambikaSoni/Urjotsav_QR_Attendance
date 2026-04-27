from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from .. import models, schemas, core
from ..database import get_db

router = APIRouter()

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    query = select(models.User).where(
        (models.User.username == user_in.username) | 
        (models.User.email == user_in.email)
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username or email already registered")
        
    # Check enrollment number if student
    if user_in.role == models.RoleEnum.STUDENT and user_in.enrollment_number:
        query = select(models.User).where(models.User.enrollment_number == user_in.enrollment_number)
        result = await db.execute(query)
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Enrollment number already registered")

    hashed_password = core.get_password_hash(user_in.password)
    user_dict = user_in.model_dump(exclude={"password"})
    
    db_user = models.User(**user_dict, hashed_password=hashed_password)
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    query = select(models.User).where(models.User.username == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not core.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=core.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = core.create_access_token(
        data={"sub": user.username, "role": user.role.value}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from . import models, schemas, core
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, core.SECRET_KEY, algorithms=[core.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    query = select(models.User).where(models.User.username == token_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: models.User = Depends(get_current_active_user)):
    role_str = getattr(current_user.role, 'value', current_user.role)
    if str(role_str).lower() != "admin":
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

async def get_current_faculty(current_user: models.User = Depends(get_current_active_user)):
    role_str = getattr(current_user.role, 'value', current_user.role)
    if str(role_str).lower() not in ["admin", "faculty"]:
        raise HTTPException(status_code=403, detail="Faculty privileges required")
    return current_user

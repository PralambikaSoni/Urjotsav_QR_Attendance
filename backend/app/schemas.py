from pydantic import BaseModel
from typing import Optional, List
import datetime
from .models import RoleEnum

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    role: RoleEnum = RoleEnum.STUDENT
    # Student specific details
    phone_number: Optional[str] = None
    enrollment_number: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    section: Optional[str] = None
    activity: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    full_name: str
    role: RoleEnum
    phone_number: Optional[str]
    enrollment_number: Optional[str]
    branch: Optional[str]
    year: Optional[str]
    semester: Optional[str]
    section: Optional[str]
    activity: Optional[str]
    
    class Config:
        from_attributes = True

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None

class EventOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_by_id: int
    is_active: bool
    created_at: datetime.datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[RoleEnum] = None

class AttendancePayload(BaseModel):
    token: str # Scanned from QR

class AuditLogOut(BaseModel):
    id: int
    action: str
    user_id: Optional[int]
    details: Optional[str]
    timestamp: datetime.datetime
    
    class Config:
        from_attributes = True

class WinnerCreate(BaseModel):
    event_id: int
    student_id: int
    position: str

class WinnerOut(BaseModel):
    id: int
    event_id: int
    student_id: int
    position: str
    
    class Config:
        from_attributes = True

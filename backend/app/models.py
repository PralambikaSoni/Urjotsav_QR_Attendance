from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from .database import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    FACULTY = "faculty"
    STUDENT = "student"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.STUDENT, nullable=False)
    
    # Extra fields for Students - keeping it simple by storing in User table as nullable
    phone_number = Column(String, nullable=True)
    enrollment_number = Column(String, unique=True, index=True, nullable=True)
    branch = Column(String, nullable=True)
    year = Column(String, nullable=True)
    semester = Column(String, nullable=True)
    section = Column(String, nullable=True)
    activity = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    
    # Event ownership/organization tied to a faculty or admin
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    
    scanned_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    student = relationship("User")
    event = relationship("Event")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who performed action
    details = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user = relationship("User")

class Winner(Base):
    __tablename__ = "winners"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    position = Column(String, nullable=False) # e.g. "1st", "2nd", "3rd"
    
    event = relationship("Event")
    student = relationship("User")

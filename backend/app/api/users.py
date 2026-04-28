from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from .. import models, schemas, core
from ..database import get_db
from ..dependencies import get_current_active_user, get_current_admin_user

router = APIRouter()

@router.get("/me", response_model=schemas.UserOut)
async def read_users_me(current_user: models.User = Depends(get_current_active_user)):
    return current_user

@router.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    # Students
    res = await db.execute(select(models.User).where(models.User.role == models.RoleEnum.STUDENT))
    students = res.scalars().all()

    # Faculties
    res_f = await db.execute(select(models.User).where(models.User.role == models.RoleEnum.FACULTY))
    faculties = res_f.scalars().all()

    # Events
    res_e = await db.execute(select(models.Event))
    events = res_e.scalars().all()

    # Attendance
    res_a = await db.execute(select(models.Attendance).options(selectinload(models.Attendance.student), selectinload(models.Attendance.event)))
    attendance_records = res_a.scalars().all()
    
    # Winners
    res_w = await db.execute(select(models.Winner))
    winners = res_w.scalars().all()
    
    # Audit Logs
    try:
        res_l = await db.execute(select(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(50))
        logs = [{"id": l.id, "action": l.action, "user_id": l.user_id, "details": l.details, "timestamp": l.timestamp.isoformat()} for l in res_l.scalars().all()]
    except:
        logs = [] # If AuditLog table isn't created yet or breaks

    # Processing Charts and Analytics
    domains = {}
    years = {}
    activities = {}
    
    # Calculate graph distributions based on ACTUAL attendance records
    for a in attendance_records:
        s = a.student
        if not s: continue
        domains[s.branch] = domains.get(s.branch, 0) + 1
        years[s.year] = years.get(s.year, 0) + 1
        if s.activity:
            activities[s.activity] = activities.get(s.activity, 0) + 1

    unique_attending_students = len(set([a.student_id for a in attendance_records]))
    
    # Average attendance percentage (Total Attendance / Total Students)
    avg_attendance = round((len(attendance_records) / len(students)) * 100, 1) if students else 0
    
    return {
        "summary": {
            "total_students": len(students),
            "total_faculty": len(faculties),
            "total_events": len(events),
            "total_attendance": len(attendance_records),
            "avg_attendance_percent": avg_attendance,
            "total_winners": len(winners)
        },
        "charts": {
            "domains": domains,
            "years": years,
            "activities": activities
        },
        "recent_logs": logs,
        "students": [
            {
                "id": s.id, "full_name": s.full_name, "enrollment_number": s.enrollment_number, 
                "branch": s.branch, "year": s.year, "section": s.section, "activity": s.activity,
                "attendance_count": len([a for a in attendance_records if a.student_id == s.id])
            } for s in students
        ],
        "faculties": [
            {
                "id": f.id, "full_name": f.full_name, "username": f.username,
                "events_coordinated": len([e for e in events if e.created_by_id == f.id])
            } for f in faculties
        ],
        "events": [
            {
                "id": e.id, "name": e.name, "description": e.description, 
                "faculty_name": next((f.full_name for f in faculties if f.id == e.created_by_id), "Admin"),
                "attendance_count": len([a for a in attendance_records if a.event_id == e.id]),
                "winners": [{"position": w.position, "student_id": w.student_id} for w in winners if w.event_id == e.id]
            } for e in events
        ]
    }

@router.post("/faculty", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
async def create_faculty(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    query = select(models.User).where(models.User.username == user_in.username)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already registered")
        
    hashed_password = core.get_password_hash(user_in.password)
    user_dict = user_in.model_dump(exclude={"password"})
    user_dict["role"] = models.RoleEnum.FACULTY
    
    db_user = models.User(**user_dict, hashed_password=hashed_password)
    db.add(db_user)
    
    # Log the action
    log = models.AuditLog(action="FACULTY_CREATED", user_id=current_user.id, details=f"Created faculty: {user_in.username}")
    db.add(log)
    
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.get("/", response_model=List[schemas.UserOut])
async def read_users(skip: int = 0, limit: int = 1000, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_admin_user)):
    result = await db.execute(select(models.User).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/student-analytics")
async def get_student_analytics(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role_str = getattr(current_user.role, 'value', current_user.role)
    if str(role_str).lower() != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    res_e = await db.execute(select(models.Event))
    events = res_e.scalars().all()
    
    res_a = await db.execute(select(models.Attendance).where(models.Attendance.student_id == current_user.id).options(selectinload(models.Attendance.event)))
    attendance = res_a.scalars().all()
    
    res_w = await db.execute(select(models.Winner).where(models.Winner.student_id == current_user.id).options(selectinload(models.Winner.event)))
    winners = res_w.scalars().all()
    
    total_events = len(events)
    attended_count = len(attendance)
    absent_count = total_events - attended_count if total_events > attended_count else 0
    percent = round((attended_count / total_events) * 100, 1) if total_events > 0 else 0
    
    attend_ids = [a.event_id for a in attendance]
    
    return {
        "summary": {
            "total_events_system": total_events,
            "attended": attended_count,
            "absent": absent_count,
            "percentage": percent
        },
        "attendance": [
            {
                "event_name": a.event.name,
                "scanned_at": a.scanned_at.isoformat() if a.scanned_at else None,
                "status": "Present"
            } for a in attendance
        ],
        "events": [
            {
                "id": e.id, "name": e.name, "description": e.description,
                "is_attended": e.id in attend_ids
            } for e in events
        ],
        "achievements": [
            {
                "event_name": w.event.name,
                "position": w.position
            } for w in winners
        ]
    }

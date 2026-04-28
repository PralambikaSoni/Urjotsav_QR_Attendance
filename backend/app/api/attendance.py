from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import JWTError, jwt

from .. import models, schemas, core
from ..database import get_db
from ..dependencies import get_current_active_user, get_current_faculty

router = APIRouter()

@router.post("/mark")
async def mark_attendance(payload: schemas.AttendancePayload, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    role_str = str(getattr(current_user.role, 'value', current_user.role)).lower()
    if role_str != "student" and role_str != "roleenum.student":
        raise HTTPException(status_code=403, detail=f"Action Restricted: Only students can mark attendance. Your role is {role_str}")
    try:
        token_data = jwt.decode(payload.token, core.SECRET_KEY, algorithms=[core.ALGORITHM])
        event_id = token_data.get("event_id")
        token_type = token_data.get("type")
        if not event_id or token_type != "dynamic_qr_attendance":
            raise HTTPException(status_code=400, detail="Invalid QR payload")
    except JWTError:
        # Token has expired or is invalid
        raise HTTPException(status_code=400, detail="QR Code expired or invalid. Please scan the current code.")

    # Check if already marked
    query = select(models.Attendance).where(
        models.Attendance.student_id == current_user.id,
        models.Attendance.event_id == event_id
    )
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Attendance already marked for this event")

    # Finalize marking
    new_attendance = models.Attendance(student_id=current_user.id, event_id=event_id)
    db.add(new_attendance)
    
    # Log the action for the Realtime Activity Panel
    log = models.AuditLog(
        action="ATTENDANCE_MARKED", 
        user_id=current_user.id, 
        details=f"Marked present for event ID {event_id}"
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(new_attendance)
    return {"message": "Attendance marked successfully!", "attendance_id": new_attendance.id}

@router.get("/event/{event_id}")
async def get_event_attendance(event_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_faculty)):
    query = (
        select(models.Attendance, models.User)
        .join(models.User, models.Attendance.student_id == models.User.id)
        .where(
            models.Attendance.event_id == event_id,
            models.User.role == models.RoleEnum.STUDENT
        )
    )
    result = await db.execute(query)
    
    attendance_records = []
    for att, user in result.all():
        attendance_records.append({
            "id": att.id,
            "scanned_at": att.scanned_at,
            "student_name": user.full_name,
            "enrollment_number": user.enrollment_number,
            "branch": user.branch
        })
    return attendance_records

@router.get("/me")
async def my_attendance(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    # If the user is admin/faculty, we just return empty sequence here or an error
    query = select(models.Attendance, models.Event).join(models.Event, models.Attendance.event_id == models.Event.id).where(models.Attendance.student_id == current_user.id)
    result = await db.execute(query)
    
    history = []
    for att, event in result.all():
        history.append({
            "attendance_id": att.id,
            "event_name": event.name,
            "scanned_at": att.scanned_at
        })
    return history

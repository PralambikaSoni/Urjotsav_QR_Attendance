from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from .. import models, schemas, core
from ..database import get_db
from ..dependencies import get_current_active_user, get_current_faculty

router = APIRouter()

@router.post("/", response_model=schemas.EventOut, status_code=status.HTTP_201_CREATED)
async def create_event(event_in: schemas.EventCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_faculty)):
    db_event = models.Event(**event_in.model_dump(), created_by_id=current_user.id)
    db.add(db_event)
    await db.commit()
    await db.refresh(db_event)
    return db_event

@router.get("/", response_model=List[schemas.EventOut])
async def read_events(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    result = await db.execute(select(models.Event).offset(skip).limit(limit))
    return result.scalars().all()

@router.get("/{event_id}/qr")
async def generate_qr(event_id: int, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_faculty)):
    # Verify event exists
    result = await db.execute(select(models.Event).where(models.Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if current_user.role != models.RoleEnum.ADMIN and event.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to generate QR for this event")
        
    token = core.create_dynamic_qr_token(event_id)
    
    # Audit log
    from ..models import AuditLog
    db.add(AuditLog(action="QR_GENERATED", user_id=current_user.id, details=f"QR for Event: {event.name}"))
    await db.commit()
    
    return {"qr_token": token, "expires_in": 60}

@router.get("/faculty-analytics")
async def get_faculty_analytics(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    if current_user.role != models.RoleEnum.FACULTY and current_user.role != models.RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    res = await db.execute(select(models.Event).where(models.Event.created_by_id == current_user.id))
    events = res.scalars().all()
    event_ids = [e.id for e in events]
    
    if not event_ids:
        return {"summary": {"total_events": 0, "total_attendance": 0}, "events": []}
        
    from sqlalchemy.orm import selectinload
    res_a = await db.execute(select(models.Attendance).where(models.Attendance.event_id.in_(event_ids)).options(selectinload(models.Attendance.student)))
    attendance = res_a.scalars().all()
    
    res_w = await db.execute(select(models.Winner).where(models.Winner.event_id.in_(event_ids)).options(selectinload(models.Winner.student)))
    winners = res_w.scalars().all()
    
    return {
        "summary": {
            "total_events": len(events),
            "total_attendance": len(attendance)
        },
        "events": [
            {
                "id": e.id, "name": e.name, "description": e.description, 
                "created_at": e.created_at.isoformat() if e.created_at else None, "is_active": e.is_active,
                "attendance_count": len([a for a in attendance if a.event_id == e.id]),
                "attendance": [{"student_name": a.student.full_name, "enrollment": a.student.enrollment_number, "scanned_at": a.scanned_at.isoformat()} for a in attendance if a.event_id == e.id],
                "winners": [{"name": w.student.full_name, "position": w.position} for w in winners if w.event_id == e.id]
            }
            for e in events
        ]
    }

@router.post("/winners", response_model=schemas.WinnerOut)
async def declare_winner(winner_in: schemas.WinnerCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_active_user)):
    res = await db.execute(select(models.Event).where(models.Event.id == winner_in.event_id))
    event = res.scalars().first()
    if not event or event.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Event not found or not owned")
    
    db_winner = models.Winner(**winner_in.model_dump())
    db.add(db_winner)
    await db.commit()
    await db.refresh(db_winner)
    return db_winner

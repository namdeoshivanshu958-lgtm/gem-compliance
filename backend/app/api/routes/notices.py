"""
Official Notices & Broadcast Ticker Routes (Phase 1).
Provides dynamic official government alerts and tender announcements.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.models.notice import OfficialNotice
from app.core.deps import get_current_user, require_roles
from app.services.audit_service import log_action

router = APIRouter(prefix="/api/notices", tags=["notices"])


class NoticeCreateSchema(BaseModel):
    title: str
    content: str
    category: Optional[str] = "TENDER_UPDATE"
    priority: Optional[str] = "NORMAL"
    expires_at: Optional[datetime] = None


@router.get("/")
def list_active_notices(db: Session = Depends(get_db)):
    """Publicly accessible list of active notices for homepage ticker."""
    notices = (
        db.query(OfficialNotice)
        .filter(OfficialNotice.is_active == True)
        .order_by(OfficialNotice.published_at.desc())
        .limit(10)
        .all()
    )
    if not notices:
        # Provide clean default government notice if none seeded
        return [
            {
                "id": "default-notice-1",
                "title": "Tender Compliance Evaluation System Active",
                "content": "AI-assisted document intelligence and deterministic compliance verification active for all CPCL GeM tenders.",
                "category": "TENDER_UPDATE",
                "priority": "NORMAL",
                "published_at": datetime.utcnow().isoformat(),
            }
        ]

    return [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "category": n.category,
            "priority": n.priority,
            "published_at": n.published_at.isoformat(),
            "expires_at": n.expires_at.isoformat() if n.expires_at else None,
        }
        for n in notices
    ]


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_notice(
    payload: NoticeCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    notice = OfficialNotice(
        title=payload.title,
        content=payload.content,
        category=payload.category or "TENDER_UPDATE",
        priority=payload.priority or "NORMAL",
        expires_at=payload.expires_at,
        created_by=current_user.id,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)

    log_action(
        db=db,
        action="CREATE_NOTICE",
        user_id=current_user.id,
        entity_type="official_notice",
        entity_id=str(notice.id),
        details={"title": notice.title},
    )

    return {"id": str(notice.id), "message": "Official notice published successfully."}


@router.delete("/{notice_id}")
def archive_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    notice = db.query(OfficialNotice).filter(OfficialNotice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    notice.is_active = False
    db.commit()
    return {"message": "Notice archived"}

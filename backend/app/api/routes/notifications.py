from typing import List, Optional
from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.bidder import Bidder
from app.models.compliance import ComplianceResult
from app.models.notification import Notification, NotificationChannel, NotificationStatus
from app.schemas.notification import NotificationOut
from app.core.deps import get_current_user, require_roles
from app.services.notification_service import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationCreateRequest(BaseModel):
    recipient: Optional[str] = None
    subject: str
    message: str
    notification_type: str = "GENERAL"
    bidder_id: Optional[str] = None
    tender_id: Optional[str] = None
    user_id: Optional[str] = None


@router.get("/", response_model=List[NotificationOut])
def list_user_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the logged-in user or their relevant role/bidders."""
    q = db.query(Notification)

    if current_user.role == UserRole.BIDDER:
        # Find bidder IDs associated with this user
        bidder_ids = [
            b.id for b in db.query(Bidder).filter(
                (Bidder.created_by == current_user.id) | (Bidder.contact_email == current_user.email)
            ).all()
        ]
        q = q.filter(
            (Notification.user_id == current_user.id)
            | (Notification.bidder_id.in_(bidder_ids))
            | (Notification.recipient == current_user.email)
        )
    else:
        # Evaluators and Admins see officer-level and system notifications
        q = q.filter(
            (Notification.user_id == current_user.id)
            | (Notification.user_id == None)
        )

    if unread_only:
        q = q.filter(Notification.is_read == False)

    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications for current user."""
    q = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role == UserRole.BIDDER:
        bidder_ids = [
            b.id for b in db.query(Bidder).filter(
                (Bidder.created_by == current_user.id) | (Bidder.contact_email == current_user.email)
            ).all()
        ]
        q = q.filter(
            (Notification.user_id == current_user.id)
            | (Notification.bidder_id.in_(bidder_ids))
            | (Notification.recipient == current_user.email)
        )
    else:
        q = q.filter(
            (Notification.user_id == current_user.id)
            | (Notification.user_id == None)
        )
    return {"unread_count": q.count()}


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "id": str(notif.id), "is_read": True}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Notification).filter(Notification.is_read == False)
    if current_user.role == UserRole.BIDDER:
        bidder_ids = [
            b.id for b in db.query(Bidder).filter(
                (Bidder.created_by == current_user.id) | (Bidder.contact_email == current_user.email)
            ).all()
        ]
        q = q.filter(
            (Notification.user_id == current_user.id)
            | (Notification.bidder_id.in_(bidder_ids))
            | (Notification.recipient == current_user.email)
        )
    else:
        q = q.filter(
            (Notification.user_id == current_user.id)
            | (Notification.user_id == None)
        )
    now = datetime.utcnow()
    updated = q.update({"is_read": True, "read_at": now}, synchronize_session=False)
    db.commit()
    return {"status": "success", "updated_count": updated}


@router.get("/bidder/{bidder_id}", response_model=List[NotificationOut])
def list_bidder_notifications(
    bidder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.bidder_id == bidder_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.post("/bidder/{bidder_id}/send", response_model=NotificationOut)
def send_bidder_alert(
    bidder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.EVALUATOR)),
):
    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    compliance_result = db.query(ComplianceResult).filter(ComplianceResult.bidder_id == bidder_id).first()
    if not compliance_result:
        raise HTTPException(status_code=404, detail="Bidder has not been evaluated yet - run compliance evaluation first")

    try:
        requirement_results = json.loads(compliance_result.requirement_results) if compliance_result.requirement_results else []
    except (json.JSONDecodeError, TypeError):
        requirement_results = []

    return notification_service.send_compliance_alert(
        bidder=bidder,
        compliance_result=compliance_result,
        requirement_results=requirement_results,
        db=db,
        user_id=str(current_user.id),
    )

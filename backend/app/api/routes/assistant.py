"""
AI Procurement Assistant API Routes (Phase 18).
Contextual, grounded retrieval against actual procurement, compliance, and blockchain data.
"""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.core.deps import get_current_user_optional
from app.services.procurement_assistant_service import query_procurement_assistant

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AssistantChatSchema(BaseModel):
    message: str
    tender_id: Optional[str] = None


@router.post("/chat")
def chat_with_assistant(
    payload: AssistantChatSchema,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    result = query_procurement_assistant(
        prompt=payload.message,
        tender_id=payload.tender_id,
        db=db,
    )
    return result

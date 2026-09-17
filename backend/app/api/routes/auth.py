from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserOut
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user
from app.core.logging_config import logger

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token(subject=user.email, role=user.role.value)
    logger.info(f"User logged in: {user.email}")
    return Token(access_token=token)


from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

from app.models.user import UserRole
from app.core.security import hash_password


class RegisterBidderRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    organization_name: str
    gem_seller_id: Optional[str] = None
    phone: Optional[str] = None


@router.post("/register-bidder", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_bidder(payload: RegisterBidderRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    new_user = User(
        id=uuid.uuid4(),
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.BIDDER,
        organization_name=payload.organization_name,
        phone=payload.phone,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"New vendor registered: {new_user.email} ({payload.organization_name})")
    token = create_access_token(subject=new_user.email, role=new_user.role.value)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


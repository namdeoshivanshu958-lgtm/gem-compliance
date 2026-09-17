import pytest
from starlette.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password, create_access_token

@pytest.fixture(scope="session")
def client():
    """FastAPI test client instance."""
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def db_session():
    """SQLAlchemy database session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(scope="session")
def admin_token(db_session):
    admin = db_session.query(User).filter(User.email == "admin@cpcl.gem").first()
    if not admin:
        admin = User(
            email="admin@cpcl.gem",
            hashed_password=hash_password("Admin@123"),
            full_name="Chief Procurement Officer",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(admin)
    else:
        admin.hashed_password = hash_password("Admin@123")
    db_session.commit()
    return create_access_token(subject=admin.email, role=admin.role.value)

@pytest.fixture(scope="session")
def evaluator_token(db_session):
    evaluator = db_session.query(User).filter(User.email == "officer@cpcl.gem").first()
    if not evaluator:
        evaluator = User(
            email="officer@cpcl.gem",
            hashed_password=hash_password("Officer@123"),
            full_name="Senior Technical Officer",
            role=UserRole.EVALUATOR,
            is_active=True
        )
        db_session.add(evaluator)
    else:
        evaluator.hashed_password = hash_password("Officer@123")
    db_session.commit()
    return create_access_token(subject=evaluator.email, role=evaluator.role.value)

@pytest.fixture(scope="session")
def bidder_token(db_session):
    bidder = db_session.query(User).filter(User.email == "vendor@cpcl.gem").first()
    if not bidder:
        bidder = User(
            email="vendor@cpcl.gem",
            hashed_password=hash_password("Vendor@123"),
            full_name="Apex Industrial Technologies",
            role=UserRole.BIDDER,
            is_active=True
        )
        db_session.add(bidder)
    else:
        bidder.hashed_password = hash_password("Vendor@123")
    db_session.commit()
    return create_access_token(subject=bidder.email, role=bidder.role.value)

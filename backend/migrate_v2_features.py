"""
Migration script for SIH 2026 PS 26100 Government e-Procurement enhancements.
Safely adds new columns, updates enums, and creates missing tables for:
- Dedicated Bidder/Vendor portal & user role
- Clarification & Document Versioning workflow
- Officer Override & Deviation workflow
- Official Notices
- Commercial / L1 Evaluation
- Document Tampering Risk Analysis

Run with: python migrate_v2_features.py
"""
from sqlalchemy import inspect, text

from app.database import Base, engine
import app.models  # noqa: F401


COLUMNS_TO_ADD = [
    ("tenders", "procurement_mode", "VARCHAR(50) DEFAULT 'L1'"),
    ("tenders", "category", "VARCHAR(100) DEFAULT 'Equipment'"),
    ("tenders", "estimated_value", "FLOAT"),
    ("tenders", "commercial_formula", "VARCHAR(255) DEFAULT 'base_plus_tax_freight_loading'"),
    ("users", "organization_name", "VARCHAR(255)"),
    ("users", "phone", "VARCHAR(50)"),
    ("bidder_documents", "tampering_risk", "VARCHAR(20) DEFAULT 'LOW'"),
    ("bidder_documents", "tampering_indicators", "TEXT"),
    ("bidder_documents", "quality_status", "VARCHAR(50) DEFAULT 'READABLE'"),
    ("bidder_documents", "current_version", "INTEGER DEFAULT 1"),
    ("compliance_results", "override_status", "VARCHAR(50)"),
    ("compliance_results", "override_justification", "TEXT"),
    ("compliance_results", "deviation_category", "VARCHAR(100)"),
    ("compliance_results", "overridden_by", "UUID REFERENCES users(id)"),
    ("compliance_results", "overridden_at", "TIMESTAMP"),
    ("compliance_results", "blockchain_tx", "VARCHAR(66)"),
    ("document_versions", "previous_document_id", "UUID REFERENCES bidder_documents(id)"),
    ("document_versions", "new_document_id", "UUID REFERENCES bidder_documents(id)"),
    ("document_versions", "status", "VARCHAR(50) DEFAULT 'ACTIVE'"),
    ("officer_decisions", "evidence", "TEXT"),
    ("commercial_bids", "applicable_loading", "FLOAT DEFAULT 0.0"),
    ("commercial_bids", "other_charges", "FLOAT DEFAULT 0.0"),
    ("notifications", "notification_type", "VARCHAR(100)"),
    ("notifications", "user_id", "UUID REFERENCES users(id)"),
    ("notifications", "is_read", "BOOLEAN DEFAULT FALSE"),
    ("notifications", "read_at", "TIMESTAMP"),
]


def migrate():
    print("=== GeM Compliance Platform Upgrade Migration ===")
    
    # 1. Update PostgreSQL ENUM types if applicable
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for val in ("BIDDER", "bidder"):
            try:
                conn.execute(text(f"ALTER TYPE userrole ADD VALUE IF NOT EXISTS '{val}';"))
                print(f"  [enum] Added '{val}' to userrole enum")
            except Exception as e:
                print(f"  [enum note] '{val}' already present or skipped: {e}")

    # 2. Create any missing tables
    print("Creating any missing tables (clarifications, versions, notices, commercial_bids, officer_decisions)...")
    Base.metadata.create_all(bind=engine)
    print("Tables initialized.")

    # 3. Add columns to existing tables
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table, column, coltype in COLUMNS_TO_ADD:
            if table not in existing_tables:
                continue
            existing_columns = {c["name"] for c in inspector.get_columns(table)}
            if column in existing_columns:
                print(f"  [skip] {table}.{column} already exists")
                continue
            print(f"  [add]  {table}.{column} {coltype}")
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))

    print("=== Migration completed successfully! ===")


if __name__ == "__main__":
    migrate()

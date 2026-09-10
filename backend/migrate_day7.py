"""
Day 7 migration - adds the tamper-evident hash-chain columns
(previous_hash, record_hash) to the audit_logs table on an EXISTING
database.

Why this is needed: init_db.py uses SQLAlchemy's create_all(), which only
creates tables that don't exist yet - it never ALTERs a table that's
already there. If you ran init_db.py before this change, your
`audit_logs` table is missing the two new columns and audit_service.py's
log_action() / verify_chain_integrity() will fail with something like:
    column audit_logs.record_hash does not exist

This script is idempotent - safe to run multiple times, and safe to run
even if the columns already exist (it checks first and skips them).

Run with: python migrate_day7.py
"""
from sqlalchemy import inspect, text

from app.database import Base, engine
import app.models  # noqa: F401  (import so Base.metadata knows about every model)


COLUMNS_TO_ADD = [
    ("audit_logs", "previous_hash", "VARCHAR(64)"),
    ("audit_logs", "record_hash", "VARCHAR(64)"),
]


def migrate():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    print("Creating any missing tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

    inspector = inspect(engine)  # re-inspect after create_all
    with engine.begin() as conn:
        for table, column, coltype in COLUMNS_TO_ADD:
            if table not in existing_tables:
                # Table itself was just created above with the column
                # already in place - nothing to ALTER.
                continue
            existing_columns = {c["name"] for c in inspector.get_columns(table)}
            if column in existing_columns:
                print(f"  [skip] {table}.{column} already exists")
                continue
            print(f"  [add]  {table}.{column} {coltype}")
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))

    print("Migration complete. Existing audit rows will have NULL hashes")
    print("(they predate the hash chain) - new rows written from now on")
    print("will be chained together. This is handled automatically by")
    print("verify_chain_integrity(), which skips rows with no hash.")


if __name__ == "__main__":
    migrate()

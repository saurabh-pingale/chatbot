"""Add shops.access_token if missing (482996f7d98f was recorded but DDL skipped).

Revision ID: f1a9c4e2b7d0
Revises: 57e817e61174
Create Date: 2026-05-01

Use IF NOT EXISTS so upgrade is safe if the column was applied normally.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "f1a9c4e2b7d0"
down_revision: Union[str, None] = "57e817e61174"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE shops ADD COLUMN IF NOT EXISTS access_token VARCHAR(500)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE shops DROP COLUMN IF EXISTS access_token")

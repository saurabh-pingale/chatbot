"""No-op: replace mistaken autogenerate diff.

Revision ID: 2d4d1921a696
Revises: 405d516f0c7f
Create Date: 2026-05-01 14:29:09.048093
"""
from typing import Sequence, Union

revision: str = "2d4d1921a696"
down_revision: Union[str, None] = "405d516f0c7f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

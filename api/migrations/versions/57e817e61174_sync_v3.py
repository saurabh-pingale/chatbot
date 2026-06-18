"""No-op: discard unsafe autogenerate sync v3.

Revision ID: 57e817e61174
Revises: 2d4d1921a696
Create Date: 2026-05-01 14:45:49.051820
"""
from typing import Sequence, Union

revision: str = "57e817e61174"
down_revision: Union[str, None] = "2d4d1921a696"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

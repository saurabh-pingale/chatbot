"""Fix user to analytics relationship to support daily records

Revision ID: d167c3276101
Revises: ba2d644f868e
Create Date: 2025-07-22 14:23:39.368200

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd167c3276101'
down_revision: Union[str, None] = 'ba2d644f868e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

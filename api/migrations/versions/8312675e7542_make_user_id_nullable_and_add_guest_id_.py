"""Make user_id nullable and add guest_id to checkout_products

Revision ID: 8312675e7542
Revises: 25e8bd51ba4a
Create Date: 2025-09-19 16:45:57.955526
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8312675e7542'
down_revision: Union[str, None] = '25e8bd51ba4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('checkout_products', sa.Column('guest_id', sa.String(length=255), nullable=True))
    op.alter_column('checkout_products', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.create_index(op.f('ix_checkout_products_guest_id'), 'checkout_products', ['guest_id'], unique=False)
    op.create_index(op.f('ix_checkout_products_user_id'), 'checkout_products', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_checkout_products_user_id'), table_name='checkout_products')
    op.drop_index(op.f('ix_checkout_products_guest_id'), table_name='checkout_products')
    op.alter_column('checkout_products', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.drop_column('checkout_products', 'guest_id')

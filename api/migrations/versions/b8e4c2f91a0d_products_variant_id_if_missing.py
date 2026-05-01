"""Add products.variant_id when d120dbfe3a1a (or chain) DDL was skipped.

Revision ID: b8e4c2f91a0d
Revises: a7c3e91f2b56
Create Date: 2026-05-01

Matches ``ProductModel`` (``shop_admin.py``): ``variant_id`` BIGINT nullable,
``unique=True`` → unique constraint ``uq_products_variant_id`` on
``(variant_id)``. Idempotent if ``variant_id`` already exists.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "b8e4c2f91a0d"
down_revision: Union[str, None] = "a7c3e91f2b56"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    col_names = {c["name"] for c in insp.get_columns("products")}
    if "variant_id" in col_names:
        return

    op.add_column(
        "products",
        sa.Column("variant_id", sa.BigInteger(), nullable=True),
    )
    op.create_unique_constraint(
        "uq_products_variant_id",
        "products",
        ["variant_id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    col_names = {c["name"] for c in insp.get_columns("products")}
    if "variant_id" not in col_names:
        return

    op.execute(
        sa.text("ALTER TABLE products DROP CONSTRAINT IF EXISTS uq_products_variant_id")
    )
    op.drop_column("products", "variant_id")

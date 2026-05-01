"""Add products.shop_id when 148b99ba8196 / 08031a9cd4cc DDL was skipped.

Revision ID: c2d4e8f0a1b3
Revises: e1f8a3c92d40
Create Date: 2026-05-01

Matches ``ProductModel``: ``shop_id`` INTEGER NOT NULL, FK to ``shops.id``.
Backfill: set from parent ``collections.shop_id`` when ``collection_id`` is set,
else smallest ``shops.id``. Idempotent if ``shop_id`` already exists.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "c2d4e8f0a1b3"
down_revision: Union[str, None] = "e1f8a3c92d40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    col_names = {c["name"] for c in insp.get_columns("products")}
    if "shop_id" in col_names:
        return

    op.add_column(
        "products",
        sa.Column("shop_id", sa.Integer(), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE products AS p
            SET shop_id = c.shop_id
            FROM collections AS c
            WHERE p.collection_id IS NOT NULL
              AND c.id = p.collection_id
              AND p.shop_id IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE products AS p
            SET shop_id = (SELECT id FROM shops ORDER BY id ASC LIMIT 1)
            WHERE p.shop_id IS NULL
              AND EXISTS (SELECT 1 FROM shops)
            """
        )
    )

    op.alter_column(
        "products",
        "shop_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_products_shop_id_shops",
        "products",
        "shops",
        ["shop_id"],
        ["id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    col_names = {c["name"] for c in insp.get_columns("products")}
    if "shop_id" not in col_names:
        return

    op.execute(
        sa.text("ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_shop_id_shops")
    )
    op.drop_column("products", "shop_id")

"""Create shop_metadata and products.variant_quantity when prior DDL was skipped.

Revision ID: e1f8a3c92d40
Revises: b8e4c2f91a0d
Create Date: 2026-05-01

Fixes:
- ``relation "shop_metadata" does not exist`` — create table aligned with
  ``ShopMetadataModel`` / ``ee2cfbc2a750`` (timestamps nullable with defaults,
  matching ``405d516f0c7f``-style nullability).
- ``column variant_quantity of relation products does not exist`` — add
  ``INTEGER`` nullable column per ``ProductModel``.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "e1f8a3c92d40"
down_revision: Union[str, None] = "b8e4c2f91a0d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    tables = set(insp.get_table_names(schema="public"))

    if "shop_metadata" not in tables:
        op.create_table(
            "shop_metadata",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("namespace", sa.String(length=255), nullable=False),
            sa.Column("config_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["shop_id"], ["shops.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("shop_id"),
        )

    prod_cols = {c["name"] for c in insp.get_columns("products")}
    if "variant_quantity" not in prod_cols:
        op.add_column(
            "products",
            sa.Column("variant_quantity", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    tables = set(insp.get_table_names(schema="public"))

    prod_cols = {c["name"] for c in insp.get_columns("products")}
    if "variant_quantity" in prod_cols:
        op.drop_column("products", "variant_quantity")

    if "shop_metadata" in tables:
        op.drop_table("shop_metadata")

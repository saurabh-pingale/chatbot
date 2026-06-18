"""Add collections.shop_id when 08031a9cd4cc DDL was never applied.

Revision ID: a7c3e91f2b56
Revises: f1a9c4e2b7d0
Create Date: 2026-05-01

Aligns ``collections`` with ``CollectionModel`` (``shop_admin.py``):
``shop_id`` INTEGER NOT NULL, FK to ``shops.id``, unique (``shop_id``, ``title``),
index on ``title``. Idempotent if ``shop_id`` already exists.

Rows without ``shop_id`` are assigned the smallest ``shops.id`` so NOT NULL
can be enforced; adjust data manually if that is wrong for your tenant mix.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "a7c3e91f2b56"
down_revision: Union[str, None] = "f1a9c4e2b7d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    col_names = {c["name"] for c in insp.get_columns("collections")}
    if "shop_id" in col_names:
        return

    op.add_column(
        "collections",
        sa.Column("shop_id", sa.Integer(), nullable=True),
    )

    op.execute(
        sa.text(
            "UPDATE collections SET shop_id = (SELECT id FROM shops ORDER BY id ASC LIMIT 1) "
            "WHERE shop_id IS NULL AND EXISTS (SELECT 1 FROM shops)"
        )
    )

    op.alter_column(
        "collections",
        "shop_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    insp = inspect(bind)
    for uc in insp.get_unique_constraints("collections"):
        cols = tuple(uc.get("column_names") or ())
        if cols == ("title",) and uc.get("name"):
            op.drop_constraint(uc["name"], "collections", type_="unique")
            break

    idx_names = {i["name"] for i in insp.get_indexes("collections")}
    if "ix_collections_title" not in idx_names:
        op.create_index(
            op.f("ix_collections_title"),
            "collections",
            ["title"],
            unique=False,
        )

    op.create_unique_constraint(
        "_shop_id_title_uc",
        "collections",
        ["shop_id", "title"],
    )
    op.create_foreign_key(
        "fk_collections_shop_id_shops",
        "collections",
        "shops",
        ["shop_id"],
        ["id"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    col_names = {c["name"] for c in insp.get_columns("collections")}
    if "shop_id" not in col_names:
        return

    op.execute(
        sa.text(
            "ALTER TABLE collections DROP CONSTRAINT IF EXISTS fk_collections_shop_id_shops"
        )
    )
    op.execute(
        sa.text("ALTER TABLE collections DROP CONSTRAINT IF EXISTS _shop_id_title_uc")
    )
    op.execute(sa.text("DROP INDEX IF EXISTS ix_collections_title"))
    op.create_unique_constraint(
        "collections_title_key",
        "collections",
        ["title"],
    )
    op.drop_column("collections", "shop_id")

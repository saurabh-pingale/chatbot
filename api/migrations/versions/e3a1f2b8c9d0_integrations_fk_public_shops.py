"""Align integrations.shop_id with public.shops(id) and repair FK.

Revision ID: e3a1f2b8c9d0
Revises: c2d4e8f0a1b3
Create Date: 2026-05-01

Some databases never ran ``505a869a82d9``, so ``integrations.shop_id`` stayed
``VARCHAR`` (legacy FK to ``shops.shop_id``). Adding
``FOREIGN KEY (shop_id) REFERENCES public.shops(id)`` then fails with a type
mismatch.

This revision:

1. Drops ``integrations_shop_id_fkey`` if present.
2. If ``integrations.shop_id`` is not an integer type, replaces it with
   ``INTEGER`` by joining ``shops`` on the domain string (``shops.shop_id``),
   drops orphan integration rows with no matching shop, sets ``NOT NULL``.
3. Creates ``integrations_shop_id_fkey`` referencing ``public.shops(id)``.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "e3a1f2b8c9d0"
down_revision: Union[str, None] = "c2d4e8f0a1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _integrations_shop_id_is_integer(bind) -> bool:
    insp = inspect(bind)
    if "integrations" not in insp.get_table_names(schema="public"):
        return False
    for col in insp.get_columns("integrations", schema="public"):
        if col["name"] != "shop_id":
            continue
        t = col["type"]
        return isinstance(t, (sa.Integer, sa.BigInteger, sa.SmallInteger))
    return False


def upgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "integrations" not in insp.get_table_names(schema="public"):
        return

    op.execute(
        sa.text(
            "ALTER TABLE public.integrations "
            "DROP CONSTRAINT IF EXISTS integrations_shop_id_fkey"
        )
    )

    if not _integrations_shop_id_is_integer(bind):
        op.execute(
            sa.text(
                "ALTER TABLE public.integrations "
                "ADD COLUMN shop_id__int INTEGER"
            )
        )
        op.execute(
            sa.text(
                """
                UPDATE public.integrations AS i
                SET shop_id__int = s.id
                FROM public.shops AS s
                WHERE i.shop_id::text = s.shop_id
                   OR (
                        trim(both from i.shop_id::text) ~ '^[0-9]+$'
                        AND s.id = cast(trim(both from i.shop_id::text) AS integer)
                    )
                """
            )
        )
        op.execute(
            sa.text(
                "DELETE FROM public.integrations WHERE shop_id__int IS NULL"
            )
        )
        op.execute(sa.text("ALTER TABLE public.integrations DROP COLUMN shop_id"))
        op.execute(
            sa.text(
                "ALTER TABLE public.integrations "
                "RENAME COLUMN shop_id__int TO shop_id"
            )
        )
        op.execute(
            sa.text(
                "ALTER TABLE public.integrations "
                "ALTER COLUMN shop_id SET NOT NULL"
            )
        )

    op.execute(
        sa.text(
            "ALTER TABLE public.integrations "
            "ADD CONSTRAINT integrations_shop_id_fkey "
            "FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)
    if "integrations" not in insp.get_table_names(schema="public"):
        return
    op.execute(
        sa.text(
            "ALTER TABLE public.integrations "
            "DROP CONSTRAINT IF EXISTS integrations_shop_id_fkey"
        )
    )
    op.create_foreign_key(
        "integrations_shop_id_fkey",
        "integrations",
        "shops",
        ["shop_id"],
        ["id"],
        ondelete="CASCADE",
    )

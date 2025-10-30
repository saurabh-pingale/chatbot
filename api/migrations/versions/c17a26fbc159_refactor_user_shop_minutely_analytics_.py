"""refactor user_shop_minutely_analytics to link to daily analytics

Revision ID: c17a26fbc159
Revises: 1caa5b3e2c22
Create Date: 2025-10-10 14:58:48.308041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c17a26fbc159'
down_revision: Union[str, None] = '1caa5b3e2c22'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user_shop_minutely_analytics', sa.Column('analytics_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_user_shop_minutely_analytics_analytics_id'), 'user_shop_minutely_analytics', ['analytics_id'], unique=False)

    op.execute("""
        UPDATE user_shop_minutely_analytics AS m
        SET analytics_id = d.id
        FROM user_shop_analytics AS d
        WHERE 
            m.shop_id = d.shop_id AND
            m.date = d.date AND
            (m.user_id = d.user_id OR m.guest_id = d.guest_id);
    """)

    op.alter_column('user_shop_minutely_analytics', 'analytics_id', existing_type=sa.INTEGER(), nullable=False)

    op.create_foreign_key(
        'fk_minutely_analytics_to_daily_analytics',
        'user_shop_minutely_analytics', 'user_shop_analytics',
        ['analytics_id'], ['id'],
        ondelete='CASCADE'
    )

    op.drop_index('uq_minutely_user_shop_minute', table_name='user_shop_minutely_analytics')
    op.drop_index('uq_minutely_guest_shop_minute', table_name='user_shop_minutely_analytics')
    
    op.drop_index(op.f('ix_user_shop_minutely_analytics_date'), table_name='user_shop_minutely_analytics')
    op.drop_column('user_shop_minutely_analytics', 'date')
    op.drop_index(op.f('ix_user_shop_minutely_analytics_guest_id'), table_name='user_shop_minutely_analytics')
    op.drop_column('user_shop_minutely_analytics', 'guest_id')
    op.drop_index(op.f('ix_user_shop_minutely_analytics_shop_id'), table_name='user_shop_minutely_analytics')
    op.drop_column('user_shop_minutely_analytics', 'shop_id')
    op.drop_index(op.f('ix_user_shop_minutely_analytics_user_id'), table_name='user_shop_minutely_analytics')
    op.drop_column('user_shop_minutely_analytics', 'user_id')
    
    op.create_index('uq_analytics_id_minute_timestamp', 'user_shop_minutely_analytics', ['analytics_id', 'minute_timestamp'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_analytics_id_minute_timestamp', table_name='user_shop_minutely_analytics')
    
    op.add_column('user_shop_minutely_analytics', sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('user_shop_minutely_analytics', sa.Column('shop_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('user_shop_minutely_analytics', sa.Column('guest_id', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.add_column('user_shop_minutely_analytics', sa.Column('date', sa.BIGINT(), autoincrement=False, nullable=True))

    op.create_index(op.f('ix_user_shop_minutely_analytics_user_id'), 'user_shop_minutely_analytics', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_shop_minutely_analytics_shop_id'), 'user_shop_minutely_analytics', ['shop_id'], unique=False)
    op.create_index(op.f('ix_user_shop_minutely_analytics_guest_id'), 'user_shop_minutely_analytics', ['guest_id'], unique=False)
    op.create_index(op.f('ix_user_shop_minutely_analytics_date'), 'user_shop_minutely_analytics', ['date'], unique=False)

    op.create_index('uq_minutely_user_shop_minute', 'user_shop_minutely_analytics', ['user_id', 'shop_id', 'minute_timestamp'], unique=True, postgresql_where=sa.text('user_id IS NOT NULL'))
    op.create_index('uq_minutely_guest_shop_minute', 'user_shop_minutely_analytics', ['guest_id', 'shop_id', 'minute_timestamp'], unique=True, postgresql_where=sa.text('guest_id IS NOT NULL'))

    op.drop_constraint('fk_minutely_analytics_to_daily_analytics', 'user_shop_minutely_analytics', type_='foreignkey')

    op.drop_index(op.f('ix_user_shop_minutely_analytics_analytics_id'), table_name='user_shop_minutely_analytics')
    op.drop_column('user_shop_minutely_analytics', 'analytics_id')
    
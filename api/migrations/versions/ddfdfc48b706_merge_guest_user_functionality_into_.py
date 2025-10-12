"""merge guest user functionality into user model by making email nullable and changing PK to UUID.

Revision ID: ddfdfc48b706
Revises: c17a26fbc159
Create Date: 2025-10-10 20:04:57.169183

""" 
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'ddfdfc48b706'
down_revision: Union[str, None] = 'c17a26fbc159'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### Start Alembic commands ###
    conn = op.get_bind()
    check_exists = conn.execute(text("""
        SELECT 1 
        FROM information_schema.table_constraints
        WHERE table_name='checkout_products'
          AND constraint_name='check_user_or_guest_checkout';
    """)).scalar()

    if check_exists:
        op.drop_constraint('check_user_or_guest_checkout', 'checkout_products', type_='check')

    op.drop_constraint('uq_guest_product_in_cart', 'checkout_products', type_='unique')
    op.drop_constraint('checkout_products_user_id_fkey', 'checkout_products', type_='foreignkey')
    
    op.drop_constraint('conversations_user_id_fkey', 'conversations', type_='foreignkey')

    op.drop_constraint('check_user_or_guest', 'user_shop_analytics', type_='check')
    op.drop_index('uq_guest_shop_date', table_name='user_shop_analytics')
    op.drop_constraint('user_shop_analytics_user_id_fkey', 'user_shop_analytics', type_='foreignkey')

    # Alter users.id safely to UUID
    op.execute('ALTER TABLE users ALTER COLUMN id DROP DEFAULT')
    op.alter_column('users', 'id',
               existing_type=sa.INTEGER(),
               type_=postgresql.UUID(as_uuid=True),
               postgresql_using='uuid_generate_v4()')
    op.execute('ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4()')

    op.alter_column('users', 'email',
               existing_type=sa.TEXT(),
               nullable=True)

    op.alter_column('checkout_products', 'user_id',
               existing_type=sa.INTEGER(),
               type_=postgresql.UUID(as_uuid=True),
               postgresql_using='uuid_generate_v4()')
    op.drop_index('ix_checkout_products_guest_id', table_name='checkout_products')
    op.drop_column('checkout_products', 'guest_id')

    op.alter_column('conversations', 'user_id',
               existing_type=sa.INTEGER(),
               type_=postgresql.UUID(as_uuid=True),
               postgresql_using='uuid_generate_v4()')
    op.drop_column('conversations', 'guest_id')

    op.alter_column('user_shop_analytics', 'user_id',
               existing_type=sa.INTEGER(),
               type_=postgresql.UUID(as_uuid=True),
               postgresql_using='uuid_generate_v4()')
    op.drop_index('ix_user_shop_analytics_guest_id', table_name='user_shop_analytics')
    op.drop_column('user_shop_analytics', 'guest_id')
    
    op.create_foreign_key(op.f('fk_checkout_products_user_id_users'), 'checkout_products', 'users', ['user_id'], ['id'])
    op.create_foreign_key(op.f('fk_conversations_user_id_users'), 'conversations', 'users', ['user_id'], ['id'])
    op.create_foreign_key(op.f('fk_user_shop_analytics_user_id_users'), 'user_shop_analytics', 'users', ['user_id'], ['id'])

    # ### End Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### Start Alembic commands ###
    op.drop_constraint(op.f('fk_user_shop_analytics_user_id_users'), 'user_shop_analytics', type_='foreignkey')
    op.drop_constraint(op.f('fk_conversations_user_id_users'), 'conversations', type_='foreignkey')
    op.drop_constraint(op.f('fk_checkout_products_user_id_users'), 'checkout_products', type_='foreignkey')

    op.add_column('user_shop_analytics', sa.Column('guest_id', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.create_index('ix_user_shop_analytics_guest_id', 'user_shop_analytics', ['guest_id'], unique=False)
    op.alter_column('user_shop_analytics', 'user_id',
               existing_type=postgresql.UUID(as_uuid=True),
               type_=sa.INTEGER(),
               postgresql_using='0')

    op.add_column('conversations', sa.Column('guest_id', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.alter_column('conversations', 'user_id',
               existing_type=postgresql.UUID(as_uuid=True),
               type_=sa.INTEGER(),
               postgresql_using='0')

    op.add_column('checkout_products', sa.Column('guest_id', sa.VARCHAR(length=255), autoincrement=False, nullable=True))
    op.create_index('ix_checkout_products_guest_id', 'checkout_products', ['guest_id'], unique=False)
    op.alter_column('checkout_products', 'user_id',
               existing_type=postgresql.UUID(as_uuid=True),
               type_=sa.INTEGER(),
               postgresql_using='0')

    op.alter_column('users', 'email',
               existing_type=sa.TEXT(),
               nullable=False)
    op.alter_column('users', 'id',
               existing_type=postgresql.UUID(as_uuid=True),
               type_=sa.INTEGER(),
               autoincrement=True,
               postgresql_using='0')

    op.create_check_constraint('check_user_or_guest', 'user_shop_analytics', '(user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL)')
    op.create_index('uq_guest_shop_date', 'user_shop_analytics', ['guest_id', 'shop_id', 'date'], unique=True, postgresql_where=sa.text('guest_id IS NOT NULL'))
    op.create_foreign_key('user_shop_analytics_user_id_fkey', 'user_shop_analytics', 'users', ['user_id'], ['id'])
    
    op.create_foreign_key('conversations_user_id_fkey', 'conversations', 'users', ['user_id'], ['id'])

    op.create_unique_constraint('uq_guest_product_in_cart', 'checkout_products', ['shop_id', 'variant_id', 'guest_id'])
    op.create_check_constraint('check_user_or_guest_checkout', 'checkout_products', '(user_id IS NOT NULL AND guest_id IS NULL) OR (user_id IS NULL AND guest_id IS NOT NULL)')
    op.create_foreign_key('checkout_products_user_id_fkey', 'checkout_products', 'users', ['user_id'], ['id'])
    
    # ### End Alembic commands ###

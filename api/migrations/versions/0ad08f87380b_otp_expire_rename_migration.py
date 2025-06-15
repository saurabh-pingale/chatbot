"""OTP expire rename migration

Revision ID: 0ad08f87380b
Revises: a6566f8cdd6f
Create Date: 2025-06-15 17:35:05.512119

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0ad08f87380b'
down_revision: Union[str, None] = 'a6566f8cdd6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop tables in the correct order (respecting foreign key constraints)
    
    # First drop indexes
    op.drop_index(op.f('ix_otps_email'), table_name='otps')
    op.drop_index(op.f('ix_user_shop_analytics_date'), table_name='user_shop_analytics')
    op.drop_index(op.f('ix_user_shop_analytics_guest_id'), table_name='user_shop_analytics')
    op.drop_index(op.f('ix_user_shop_analytics_shop_id'), table_name='user_shop_analytics')
    op.drop_index(op.f('ix_user_shop_analytics_user_id'), table_name='user_shop_analytics')
    op.drop_index(op.f('uq_guest_shop_date'), table_name='user_shop_analytics', postgresql_where='(guest_id IS NOT NULL)')
    op.drop_index(op.f('uq_user_shop_date'), table_name='user_shop_analytics', postgresql_where='(user_id IS NOT NULL)')
    op.drop_index(op.f('ix_shops_shop_id'), table_name='shops')
    
    # Then drop tables in order of dependencies
    op.drop_table('checkout_products')  # Depends on products, collections, users, shops
    op.drop_table('products')  # Depends on collections
    op.drop_table('user_shop_analytics')  # Depends on users, shops
    op.drop_table('conversations')  # Depends on users, shops
    op.drop_table('users')  # Depends on shops
    op.drop_table('collections')  # No dependencies
    op.drop_table('otps')  # No dependencies
    op.drop_table('shops')  # No dependencies


def downgrade() -> None:
    """Downgrade schema."""
    # Create tables in reverse order of dependencies
    op.create_table('shops',
        sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('shops_id_seq'::regclass)"), autoincrement=True, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
        sa.Column('shop_id', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('shop_description', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('preferred_color', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('region', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('country', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('support_email', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('support_phone', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('image', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('show_email_gate', sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.Column('owner_name', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('owner_email', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('owner_location', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('plan', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('plan_start_date', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
        sa.Column('plan_end_date', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
        sa.Column('setup_completed', sa.BOOLEAN(), autoincrement=False, nullable=False),
        sa.PrimaryKeyConstraint('id', name='shops_pkey'),
        postgresql_ignore_search_path=False
    )
    op.create_index(op.f('ix_shops_shop_id'), 'shops', ['shop_id'], unique=True)

    op.create_table('collections',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('title', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('products_count', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('collections_pkey')),
        sa.UniqueConstraint('title', name=op.f('collections_title_key'))
    )

    op.create_table('otps',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('email', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('otp', sa.VARCHAR(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
        sa.Column('expires_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('otps_pkey'))
    )
    op.create_index(op.f('ix_otps_email'), 'otps', ['email'], unique=False)

    op.create_table('users',
        sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('users_id_seq'::regclass)"), autoincrement=True, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
        sa.Column('email', sa.TEXT(), autoincrement=False, nullable=False),
        sa.Column('city', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('region', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('country', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('ip_address', sa.TEXT(), autoincrement=False, nullable=True),
        sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
        sa.Column('shop_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], name='users_shop_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='users_pkey'),
        sa.UniqueConstraint('email', 'shop_id', name='uq_user_email_shop_id'),
        postgresql_ignore_search_path=False
    )

    op.create_table('products',
        sa.Column('id', sa.BIGINT(), autoincrement=False, nullable=False),
        sa.Column('title', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('description', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('category', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('url', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('price', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True),
        sa.Column('image', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('collection_id', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], name='products_collection_id_fkey'),
        sa.PrimaryKeyConstraint('id', name='products_pkey'),
        postgresql_ignore_search_path=False
    )

    op.create_table('user_shop_analytics',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column('guest_id', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
        sa.Column('shop_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('date', sa.DATE(), autoincrement=False, nullable=False),
        sa.Column('chat_interactions_count', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('opened_chatbot_count', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('added_to_cart_count', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('purchased_count', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('purchase_amount', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=False),
        sa.Column('utm_source', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('utm_medium', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('utm_campaign', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('utm_term', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('utm_content', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.CheckConstraint('user_id IS NOT NULL AND guest_id IS NULL OR user_id IS NULL AND guest_id IS NOT NULL', name=op.f('check_user_or_guest')),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], name=op.f('user_shop_analytics_shop_id_fkey')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('user_shop_analytics_user_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('user_shop_analytics_pkey'))
    )
    op.create_index(op.f('uq_user_shop_date'), 'user_shop_analytics', ['user_id', 'shop_id', 'date'], unique=True, postgresql_where='(user_id IS NOT NULL)')
    op.create_index(op.f('uq_guest_shop_date'), 'user_shop_analytics', ['guest_id', 'shop_id', 'date'], unique=True, postgresql_where='(guest_id IS NOT NULL)')
    op.create_index(op.f('ix_user_shop_analytics_user_id'), 'user_shop_analytics', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_shop_analytics_shop_id'), 'user_shop_analytics', ['shop_id'], unique=False)
    op.create_index(op.f('ix_user_shop_analytics_guest_id'), 'user_shop_analytics', ['guest_id'], unique=False)
    op.create_index(op.f('ix_user_shop_analytics_date'), 'user_shop_analytics', ['date'], unique=False)

    op.create_table('conversations',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('user_query', sa.TEXT(), autoincrement=False, nullable=False),
        sa.Column('agent_response', sa.TEXT(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
        sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column('guest_id', sa.VARCHAR(), autoincrement=False, nullable=True),
        sa.Column('shop_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], name=op.f('conversations_shop_id_fkey')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('conversations_user_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('conversations_pkey'))
    )

    op.create_table('checkout_products',
        sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
        sa.Column('product_count', sa.INTEGER(), autoincrement=False, nullable=True),
        sa.Column('product_id', sa.BIGINT(), autoincrement=False, nullable=False),
        sa.Column('collection_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('shop_id', sa.INTEGER(), autoincrement=False, nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
        sa.ForeignKeyConstraint(['collection_id'], ['collections.id'], name=op.f('checkout_products_collection_id_fkey')),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('checkout_products_product_id_fkey')),
        sa.ForeignKeyConstraint(['shop_id'], ['shops.id'], name=op.f('checkout_products_shop_id_fkey')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('checkout_products_user_id_fkey')),
        sa.PrimaryKeyConstraint('id', name=op.f('checkout_products_pkey'))
    )

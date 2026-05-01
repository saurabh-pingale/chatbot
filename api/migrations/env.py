# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

from app.config import DATABASE_URL
from app.models.db.base import Base
# Import all models so Base.metadata is complete for autogenerate (omitting any
# table that exists in the DB but not here produces bogus DROP operations).
#
# DB handlers (e.g. ShopConfigHandler) are not tables — only import ORM models.
# ShopConfigHandler reads ``shops`` (ShopModel) and may use ``shop_metadata``
# (ShopMetadataModel); both must stay imported so missing tables appear in diffs.
from app.models.db.shop_admin import (
    ShopModel,
    ShopMetadataModel,
    UserModel,
    CollectionModel,
    ProductModel,
    UserShopAnalyticsModel,
    UserShopMinutelyAnalyticsModel,
    IntegrationModel,
    OfferModel,
)
from app.models.db.cart import CartItemModel
from app.models.db.checkout_product import CheckoutProductModel
from app.models.db.conversation import ConversationModel
from app.models.db.country_code import CountryCodeModel
from app.models.db.order import OrderModel, OrderItemModel
from app.models.db.subscription import SubscriptionModel

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

_APP_SCHEMAS = frozenset({None, "public"})


def include_object(obj, name, type_, reflected, compare_to):
    """Ignore tables/indexes in Supabase-managed schemas when autogenerating."""
    if reflected and getattr(obj, "schema", None) not in _APP_SCHEMAS:
        return False
    return True


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = DATABASE_URL.replace('+asyncpg', '')  # Remove asyncpg driver
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_schemas=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = DATABASE_URL.replace('+asyncpg', '')  # Remove asyncpg driver
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

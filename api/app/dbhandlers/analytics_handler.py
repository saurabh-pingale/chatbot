import json
from typing import Dict, Any
from sqlalchemy import func, distinct, select
from sqlalchemy.exc import SQLAlchemyError

from app.dbhandlers.db import AsyncSessionLocal
from app.utils.analytics_utils import create_analytics_record
from app.models.db.shop_admin import AnalyticsModel
from app.utils.logger import logger

class AnalyticsHandler:
    def __init__(self):
        pass

    async def store_analytics_data(self, analytics_data: Dict) -> bool:
        """Stores a single session's analytics data."""
        async with AsyncSessionLocal() as session:
            try:
                analytics_record = create_analytics_record(analytics_data)
                session.add(analytics_record)
                await session.commit()
                return True
            except SQLAlchemyError as error:
                await session.rollback()
                logger.error("Database error in store_analytics_data: %s", str(error), exc_info=True)
                return False
            except Exception as e:
                await session.rollback()
                logger.error("General error in store_analytics_data: %s", str(e), exc_info=True)
                return False

    async def fetch_aggregated_analytics(self, shop_id: str) -> Dict[str, Any]:
        """Fetches aggregated analytics data for a given shop_id."""
        async with AsyncSessionLocal() as session:
            try:
                stmt_total_chat_interactions = select(func.sum(AnalyticsModel.chat_interactions))\
                    .where(AnalyticsModel.store_id == shop_id)
                total_chat_interactions_result = await session.execute(stmt_total_chat_interactions)
                total_chat_interactions = total_chat_interactions_result.scalar_one_or_none() or 0

                stmt_unique_users = select(func.count(distinct(AnalyticsModel.email)))\
                    .where(AnalyticsModel.store_id == shop_id)
                unique_users_result = await session.execute(stmt_unique_users)
                unique_users = unique_users_result.scalar_one_or_none() or 0

                stmt_user_locations = select(
                    AnalyticsModel.country,
                    AnalyticsModel.city,
                    func.count(AnalyticsModel.id).label('count')
                )\
                    .where(AnalyticsModel.store_id == shop_id)\
                    .group_by(AnalyticsModel.country, AnalyticsModel.city)\
                    .order_by(func.count(AnalyticsModel.id).desc())\
                    .limit(5)
                user_locations_result = await session.execute(stmt_user_locations)
                user_locations = [
                    {"country": loc.country, "city": loc.city, "count": loc.count}
                    for loc in user_locations_result.mappings().all()
                ]

                stmt_products_added_to_cart = select(func.sum(AnalyticsModel.products_added_to_cart))\
                    .where(AnalyticsModel.store_id == shop_id)
                products_added_to_cart_result = await session.execute(stmt_products_added_to_cart)
                products_added_to_cart = products_added_to_cart_result.scalar_one_or_none() or 0

                stmt_total_purchases_count = select(func.sum(AnalyticsModel.products_purchased))\
                    .where(AnalyticsModel.store_id == shop_id)
                total_purchases_count_result = await session.execute(stmt_total_purchases_count)
                total_purchases_count = total_purchases_count_result.scalar_one_or_none() or 0

                stmt_total_purchase_value = select(func.sum(AnalyticsModel.total_purchase_value))\
                    .where(AnalyticsModel.store_id == shop_id)
                total_purchase_value_result = await session.execute(stmt_total_purchase_value)
                total_purchase_value = total_purchase_value_result.scalar_one_or_none() or 0.0

                stmt_all_purchased_items = select(AnalyticsModel.purchased_items_details)\
                    .where(
                        AnalyticsModel.store_id == shop_id,
                        AnalyticsModel.purchased_items_details.isnot(None)
                    )
                all_purchased_items_result = await session.execute(stmt_all_purchased_items)

                product_summary = {}
                for details_json in all_purchased_items_result.scalars().all():
                    try:
                        items = json.loads(details_json)
                        for item in items:
                            prod_id = item.get('id')
                            if prod_id:
                                prod_id_key = str(prod_id)
                                if prod_id_key not in product_summary:
                                    product_summary[prod_id_key] = {
                                        'name': item.get('name', 'Unknown Product'),
                                        'quantity': 0,
                                        'revenue': 0.0,
                                        'original_id': prod_id
                                    }
                                product_summary[prod_id_key]['quantity'] += item.get('quantity', 0)
                                product_summary[prod_id_key]['revenue'] += float(item.get('revenue', 0.0))
                    except json.JSONDecodeError:
                        logger.warning(f"Could not parse purchased_items_details: {details_json}")
                    except TypeError as te: 
                        logger.error(f"TypeError processing product ID {prod_id}: {te}", exc_info=True)


                sorted_products_tuples = sorted(product_summary.items(), key=lambda x: x[1]['revenue'], reverse=True)

                top_purchased_products = [
                    {
                        "id": data.get('original_id', pid),
                        "name": data['name'],
                        "quantity": data['quantity'],
                        "revenue": data['revenue']
                    }
                    for pid, data in sorted_products_tuples[:5]
                ]


                return {
                    "totalChatInteractions": total_chat_interactions,
                    "uniqueUsers": unique_users,
                    "userLocations": user_locations,
                    "productsAddedToCart": products_added_to_cart,
                    "totalPurchasesCount": total_purchases_count,
                    "totalPurchaseValue": total_purchase_value,
                    "topPurchasedProducts": top_purchased_products,
                }

            except SQLAlchemyError as error:
                logger.error(f"Database error in fetch_aggregated_analytics for shop_id {shop_id}: {str(error)}", exc_info=True)
                return {
                    "totalChatInteractions": 0,
                    "uniqueUsers": 0,
                    "userLocations": [],
                    "productsAddedToCart": 0,
                    "totalPurchasesCount": 0,
                    "totalPurchaseValue": 0.0,
                    "topPurchasedProducts": [],
                    "error": str(error)
                }
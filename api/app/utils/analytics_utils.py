import json
from typing import Dict
from app.models.db.shop_admin import AnalyticsModel
from app.utils.logger import logger
from datetime import datetime

def create_analytics_record(session_data: Dict) -> AnalyticsModel:
    """Creates a new analytics record from session data."""
    logger.info(f"Creating analytics record for session data: {session_data}")

    session_start_str = session_data.get('session_start')
    session_end_str = session_data.get('session_end')

    session_start_dt = None
    if session_start_str:
        try:
            aware_dt = datetime.fromisoformat(session_start_str.replace('Z', '+00:00'))
            session_start_dt = aware_dt.replace(tzinfo=None)
        except ValueError:
            logger.warning(f"Could not parse session_start_str: {session_start_str}")
            session_start_dt = datetime.utcnow() 

    session_end_dt = None
    if session_end_str:
        try:
            aware_dt = datetime.fromisoformat(session_end_str.replace('Z', '+00:00'))
            session_end_dt = aware_dt.replace(tzinfo=None)
        except ValueError:
            logger.warning(f"Could not parse session_end_str: {session_end_str}")
            pass

    purchased_items = session_data.get('top_purchased_products', [])
    if not isinstance(purchased_items, list):
        logger.warning(f"purchased_items was not a list: {purchased_items}. Defaulting to empty list.")
        purchased_items = []

    record = AnalyticsModel(
        shop_id=session_data.get('shop_id'),
        email=session_data.get('email'),
        is_anonymous=session_data.get('is_anonymous', False),
        country=session_data.get('country'),
        region=session_data.get('region'),
        city=session_data.get('city'),
        ip=session_data.get('ip'),
        session_start_time=session_start_dt, 
        session_end_time=session_end_dt,  
        chat_interactions=session_data.get('total_chat_interactions', 0),
        products_added_to_cart=session_data.get('products_added_to_cart', 0),
        products_purchased=session_data.get('products_purchased', 0),
        total_purchase_value=session_data.get('total_purchase_value', 0.0),
        purchased_items_details=json.dumps(purchased_items) 
    )
    logger.info(f"Constructed analytics record: {record}")
    return record
from typing import Dict
from sqlalchemy.orm import Session
from app.models.db.store_admin import ChatbotAnalytics

def handle_anonymous_user(session: Session, session_data: Dict) -> None:
    """Handles storage logic for anonymous users"""
    email = session_data.get('email', '')
    existing_record = session.query(ChatbotAnalytics)\
        .filter_by(store_id=session_data.get('store_id'), is_anonymous=True)\
        .first()
    
    if existing_record:
        existing_record.anonymous_count += 1
        existing_record.total_users += 1
        existing_record.chat_interactions += session_data.get('total_chat_interactions', 0)
        existing_record.products_added_to_cart += session_data.get('total_products_added_to_cart', 0)
        existing_record.products_purchased += session_data.get('total_products_purchased', 0)
        existing_record.last_interaction = session_data.get('session_end')
    else:
        analytics_record = create_analytics_record(session_data, is_anonymous=True)
        session.add(analytics_record)

def handle_email_user(session: Session, session_data: Dict) -> None:
    """Handles storage logic for email users"""
    analytics_record = create_analytics_record(session_data, is_anonymous=False)
    session.add(analytics_record)

def create_analytics_record(session_data: Dict, is_anonymous: bool) -> ChatbotAnalytics:
    """Creates a new analytics record with common fields"""
    email = session_data.get('email', '')
    return ChatbotAnalytics(
        store_id=session_data.get('store_id'),
        email=email,
        is_anonymous=is_anonymous,
        anonymous_count=1 if is_anonymous else 0,
        total_users=1,
        country=session_data.get('location', {}).get('country'),
        region=session_data.get('location', {}).get('region'),
        city=session_data.get('location', {}).get('city'),
        ip=session_data.get('ip'),
        chat_interactions=session_data.get('total_chat_interactions', 0),
        first_interaction=session_data.get('first_interaction'),
        last_interaction=session_data.get('session_end'),
        products_added_to_cart=session_data.get('total_products_added_to_cart', 0),
        products_purchased=session_data.get('total_products_purchased', 0)
    )
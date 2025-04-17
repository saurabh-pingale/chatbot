from typing import Dict
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# from app.models.db.store_admin import Base
# from app.utils.analytics_utils import handle_anonymous_user, handle_email_user
# from app.utils.logger import logger
from app.config import DATABASE_URL

class AnalyticsHandler:
    def __init__(self):
        database_url = DATABASE_URL
        if not database_url:
            raise ValueError("Database URL must be provided in environment variables.")
        
        self.engine = create_engine(database_url)
        self.Session = sessionmaker(bind=self.engine)
        # Base.metadata.create_all(self.engine)

    async def store_analytics_data(self, analytics_data: Dict) -> bool:
        """Stores analytics data (anonymous or email-based)."""
        # logger.info(f"Received Analytics Data: {analytics_data}")
        # session = self.Session()
        # try:
        #     email = analytics_data.get('email', '')
        #     is_anonymous = email.startswith('Anonymous_')

        #     if is_anonymous: 
        #         logger.info(f"Handling Anonymous User")
        #         handle_anonymous_user(session, analytics_data)
        #     else:
        #         logger.info(f"Handling Email User")
        #         handle_email_user(session, analytics_data)

        #     session.commit()
        #     return True
        # except SQLAlchemyError as error:
        #     session.rollback()
        #     logger.error("Database error in store_session_data: %s", str(error), exc_info=True)
        #     return False
        # finally:
        #     session.close()
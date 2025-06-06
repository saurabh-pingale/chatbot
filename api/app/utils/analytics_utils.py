import json
from typing import Dict
# Removed: from app.models.db.shop_admin import AnalyticsModel -> This model is replaced
from app.utils.logger import logger
from datetime import datetime

# The function create_analytics_record was here and is now removed 
# as it pertains to the old AnalyticsModel and data structure.
# New analytics data handling will be done directly in the dbhandler or route logic
# based on the new UserShopAnalyticsModel and UserModel.

# If any other utility functions were in this file and are still needed, they would remain.
# For now, this file will be mostly empty or could be removed if no other analytics utils are needed.
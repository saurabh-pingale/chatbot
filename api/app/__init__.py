from app.custom_fastapi import CustmFastAPI

from app.routes import init_routes
from app.services import init_services
from app.dbhandlers import init_handlers

def create_app() -> CustmFastAPI:
    app = CustmFastAPI(__name__)

    init_handlers(app)
    init_services(app)
    init_routes(app)

    return app

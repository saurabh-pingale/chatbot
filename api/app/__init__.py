from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.custom_fastapi import CustmFastAPI
from app.utils.rate_limiter import limiter

def create_app() -> 'CustmFastAPI':
    from app.custom_fastapi import CustmFastAPI
    from app.routes import init_routes
    from app.services import init_services
    from app.dbhandlers import init_handlers
    
    app = CustmFastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    init_handlers(app)
    init_services(app)
    init_routes(app)

    return app
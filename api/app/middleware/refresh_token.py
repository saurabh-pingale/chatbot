from fastapi import Request
from starlette.middleware.base import RequestResponseEndpoint
from starlette.responses import Response

async def add_refreshed_token_header(request: Request, call_next: RequestResponseEndpoint) -> Response:
    response = await call_next(request)

    if hasattr(request.state, "new_token") and request.state.new_token:
        response.headers["X-Token-Refreshed"] = request.state.new_token
        response.headers["Access-Control-Expose-Headers"] = "X-Token-Refreshed"
        response.headers["Access-Control-Allow-Origin"] = "*"

    return response

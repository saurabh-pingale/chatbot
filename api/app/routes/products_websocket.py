from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio

from app.external_service.redis_client import get_redis_client
from app.utils.products_utils import check_and_update_stalled_status
from app.utils.logger import logger

products_ws_router = APIRouter()

@products_ws_router.websocket("/products_router/ws/{task_id}")
async def product_progress_ws(websocket: WebSocket, task_id: str):
    await websocket.accept()

    try:
        shop_id = websocket.query_params.get("shop")
        if not shop_id:
            await websocket.close(code=1008)
            return

        redis_client = await get_redis_client()
        redis_key = f"task_progress_{shop_id}_{task_id}"

        last_sent_status = None

        while True:
            try:
                progress_data = await redis_client.get(redis_key)

                if progress_data:
                    task_details = json.loads(progress_data)

                    if task_details.get("shop_id") != shop_id:
                        await websocket.close(code=1008)
                        return

                    task_details = check_and_update_stalled_status(task_details)

                    if task_details != last_sent_status:
                        await websocket.send_json(task_details)
                        last_sent_status = task_details

                    if task_details["status"] in ["completed", "failed"]:
                        break
                else:
                    await websocket.send_json({
                        "percentage": 0,
                        "message": "Initializing...",
                        "status": "pending"
                    })

                await asyncio.sleep(1)

            except Exception as inner_error:
                logger.error(f"WebSocket loop error: {inner_error}")
                break

        await asyncio.sleep(0.5)
        await websocket.close()

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for task {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {e}")
        try:
            await websocket.close()
        except:
            pass
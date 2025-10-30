import json
import math
import asyncio
from datetime import datetime, timezone
from redis.exceptions import ConnectionError

from app.external_service.redis_client import get_redis_client
from app.utils.logger import logger

class ProgressTracker:
    """
    Manages and reports the progress of a background task using a weight-based system.
    Throttles Redis updates and persists final statuses.
    """

    def __init__(self, namespace: str, task_id: str, steps_config: dict):
        self.namespace = namespace
        self.task_id = task_id
        self.steps_config = steps_config
        self.redis_key = f"task_progress_{namespace}_{task_id}"
        self.total_weight = sum(steps_config.values())
        self.completed_weight = 0
        self.last_reported_percentage = -1
        self.step_order = list(steps_config.keys()) # For idempotent calculation

    async def initialize(self):
        """ Load the last known state from Redis, if it exists. """
        try:
            redis_client = await get_redis_client()
            existing_data = await redis_client.get(self.redis_key)
            if existing_data:
                task_details = json.loads(existing_data)
                # Restore state from the last update
                last_percentage = task_details.get("percentage", 0)
                if last_percentage > 0:
                    self.last_reported_percentage = last_percentage
                    # Recalculate completed_weight based on the last known percentage
                    self.completed_weight = (last_percentage / 100) * self.total_weight
                    logger.info(f"Resumed task {self.task_id} at {last_percentage}% progress.")
        except Exception as e:
            logger.error(f"Could not initialize ProgressTracker state for {self.task_id}: {e}")

    async def _update_redis(self, percentage: int, message: str, status: str = "processing"):
        """Updates the task progress in Redis if the percentage has increased."""
        # Clamp percentage between 0 and 100
        safe_percentage = max(0, min(100, percentage))

        # Only write to Redis if the percentage has changed.
        if safe_percentage <= self.last_reported_percentage and status == "processing":
            return
        
        max_retries = 3
        retry_delay_seconds = 5

        for attempt in range(max_retries):
            try:
                redis_client = await get_redis_client()
                progress_data = {
                    "shop_id": self.namespace,
                    "task_id": self.task_id,
                    "percentage": safe_percentage,
                    "message": message,
                    "status": status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }

                await redis_client.set(self.redis_key, json.dumps(progress_data))

                # Extend lock TTL during active progress updates
                lock_key = f"task_lock_{self.namespace}"
                if status == "processing":
                    await redis_client.expire(lock_key, 3600)  # Extend by another hour

                self.last_reported_percentage = safe_percentage
                return
            except ConnectionError as e:
                logger.warning(f"Redis connection failed on attempt {attempt + 1}/{max_retries}. Retrying in {retry_delay_seconds}s...")
                if attempt + 1 == max_retries:
                    logger.error(f"Could not update Redis progress for task {self.task_id} after {max_retries} attempts: {e}")
                    raise  # Re-raise the exception after the final attempt
                await asyncio.sleep(retry_delay_seconds)

    async def report_progress(self, step_name: str, message: str):
        """Reports progress for a completed step by updating the percentage."""
        if step_name in self.steps_config:
            # Idempotent calculation to prevent math drift
            try:
                current_step_index = self.step_order.index(step_name)
                # Sum weights of all steps up to and including the current one
                self.completed_weight = sum(
                    self.steps_config[s] for s in self.step_order[:current_step_index + 1]
                )
            except ValueError:
                # Fallback for safety, though it shouldn't be hit
                self.completed_weight += self.steps_config[step_name]
                
            target_percentage = math.floor((self.completed_weight / self.total_weight) * 100)
            await self._update_redis(target_percentage, message)

    async def report_incremental_progress(self, step_name: str, current_item: int, total_items: int, message_template: str):
        """
        Reports incremental progress for a loop. Throttles updates by only writing to Redis
        when the integer percentage value changes.
        """
        if step_name in self.steps_config and total_items > 0:
            step_weight = self.steps_config[step_name]
            # Weight of previously completed steps (idempotently calculated)
            try:
                current_step_index = self.step_order.index(step_name)
                base_weight = sum(
                    self.steps_config[s] for s in self.step_order[:current_step_index]
                )
            except ValueError:
                base_weight = self.completed_weight
            
            incremental_weight = (current_item / total_items) * step_weight
            current_total_weight = base_weight + incremental_weight
            target_percentage = math.floor((current_total_weight / self.total_weight) * 100)
            
            message = message_template.format(current=current_item, total=total_items)
            await self._update_redis(target_percentage, message)

    async def complete(self, message: str):
        """Marks the task as 100% complete and persists the state."""
        await self._update_redis(100, message, "completed")

    async def fail(self, message: str):
        """Marks the task as failed and persists the state."""
        # You may want to report the current percentage or jump to 100
        current_percentage = self.last_reported_percentage if self.last_reported_percentage >= 0 else 0
        await self._update_redis(current_percentage, message, "failed")
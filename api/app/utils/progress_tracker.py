import json
from app.external_service.redis_client import get_redis_client
from app.utils.logger import logger

class ProgressTracker:
    """Manages and reports the progress of a background task using a weight-based system."""

    def __init__(self, task_id: str, steps_config: dict):
        self.task_id = task_id
        self.steps_config = steps_config
        self.total_weight = sum(steps_config.values())
        self.completed_weight = 0
        self.last_reported_percentage = -1

    async def _update_redis(self, percentage: int, message: str, status: str = "processing"):
        """Updates the task progress in Redis if the percentage has increased."""
        # Ensure percentage only moves forward
        if percentage <= self.last_reported_percentage:
            return

        # Clamp percentage between 0 and 100
        safe_percentage = max(0, min(100, percentage))

        try:
            redis_client = await get_redis_client()
            progress_data = {
                "percentage": safe_percentage,
                "message": message,
                "status": status,
            }
            await redis_client.set(f"task_progress_{self.task_id}", json.dumps(progress_data), ex=3600)
            self.last_reported_percentage = safe_percentage
        except Exception as e:
            logger.error(f"Could not update Redis progress for task {self.task_id}: {e}")

    async def report_progress(self, step_name: str, message: str):
        """Reports progress for a completed step by updating the percentage."""
        if step_name in self.steps_config:
            self.completed_weight += self.steps_config[step_name]
            target_percentage = int((self.completed_weight / self.total_weight) * 100)
            await self._update_redis(target_percentage, message)

    async def report_incremental_progress(self, step_name: str, current_item: int, total_items: int, message_template: str):
        """Reports incremental progress for a step that contains a loop."""
        if step_name in self.steps_config and total_items > 0:
            step_weight = self.steps_config[step_name]
            # Weight of previously completed steps
            base_weight = self.completed_weight
            
            # Additional weight from the current in-progress step
            incremental_weight = (current_item / total_items) * step_weight
            
            current_total_weight = base_weight + incremental_weight
            target_percentage = int((current_total_weight / self.total_weight) * 100)
            
            message = message_template.format(current=current_item, total=total_items)
            await self._update_redis(target_percentage, message)

    async def complete(self, message: str):
        """Marks the task as 100% complete."""
        await self._update_redis(100, message, "completed")

    async def fail(self, message: str):
        """Marks the task as failed."""
        # You may want to report the current percentage or jump to 100
        await self._update_redis(self.last_reported_percentage, message, "failed")
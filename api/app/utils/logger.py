import logging
import sys
import os
from typing import Optional

def configure_logger(
    name: str = "app",
    log_level: int = logging.INFO,
    log_format: Optional[str] = None,
    date_format: Optional[str] = None,
    log_to_file: bool = False,
    log_file_path: Optional[str] = None
) -> logging.Logger:

    if log_format is None:
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    if date_format is None:
        date_format = "%Y-%m-%d %H:%M:%S"

    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(log_format, datefmt=date_format)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    if log_to_file:
        if not log_file_path:
            root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            logs_dir = os.path.join(root_dir, "logs")
            os.makedirs(logs_dir, exist_ok=True)
            log_file_path = os.path.join(logs_dir, "app.log")

        file_handler = logging.FileHandler(log_file_path, encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    logger.setLevel(log_level)
    logger.propagate = False

    return logger

logger = configure_logger("app", log_to_file=True)
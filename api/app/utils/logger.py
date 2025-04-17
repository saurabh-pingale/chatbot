import logging
import sys
from typing import Optional

def configure_logger(
    name: str = "app",
    log_level: int = logging.INFO,
    log_format: Optional[str] = None,
    date_format: Optional[str] = None,
    log_to_file: bool = False,
    log_file_path: str = "app.log"
) -> logging.Logger:

    if log_format is None:
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    if date_format is None:
        date_format = "%Y-%m-%d %H:%M:%S"

    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(log_format, datefmt=date_format)

    # Console handler
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    # Optional file handler
    if log_to_file:
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    logger.setLevel(log_level)
    logger.propagate = False

    return logger

logger = configure_logger("app")
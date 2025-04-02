import logging
import sys
from typing import Optional

def configure_logger(
    name: str = "app",
    log_level: int = logging.INFO,
    log_format: Optional[str] = None,
    date_format: Optional[str] = None
) -> logging.Logger:

    if log_format is None:
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    if date_format is None:
        date_format = "%Y-%m-%d %H:%M:%S"

    logger = logging.getLogger(name)

    if logger.handlers:
        return logger
    
    formatter = logging.Formatter(log_format, datefmt=date_format)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    
    logger.setLevel(log_level)
    logger.addHandler(handler)
    
    logger.propagate = False
    
    return logger

logger = configure_logger("app")
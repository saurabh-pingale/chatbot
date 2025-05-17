from enum import Enum, auto
from typing import Optional

class AgentState(Enum):
    INIT = auto()
    CLASSIFYING = auto()
    PROCESSING_GREETING = auto()
    PROCESSING_PRODUCT = auto()
    PROCESSING_ORDER = auto()
    PROCESSING_TERMS = auto()
    PROCESSING_PAYMENT = auto()
    EVALUATING = auto()
    FALLBACK = auto()
    COMPLETE = auto()
    ERROR = auto()

    @property
    def is_processing_state(self) -> bool:
        return self.name.startswith('PROCESSING_')

    @property
    def classification_type(self) -> Optional[str]:
        if self.is_processing_state:
            return self.name.split('_')[-1].lower()
        return None
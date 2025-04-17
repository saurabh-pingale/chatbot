from enum import Enum, auto

class AgentState(Enum):
    INIT = auto()
    CLASSIFYING = auto()
    PROCESSING_GREETING = auto()
    PROCESSING_PRODUCT = auto()
    PROCESSING_ORDER = auto()
    EVALUATING = auto()
    FALLBACK = auto()
    COMPLETE = auto()
    ERROR = auto()
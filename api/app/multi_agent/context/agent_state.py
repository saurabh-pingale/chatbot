from enum import Enum, auto

class AgentState(Enum):
    INIT = auto()
    CLASSIFYING = auto()
    PROCESSING_GREETING = auto()
    PROCESSING_PRODUCT = auto()
    PROCESSING_ORDER = auto()
    PROCESSING_TERMS = auto()
    EVALUATING = auto()
    FALLBACK = auto()
    COMPLETE = auto()
    ERROR = auto()
from enum import Enum, auto

# Define states for the state machine
class AgentState(Enum):
    INIT = auto()
    CLASSIFYING = auto()
    PROCESSING_GREETING = auto()
    PROCESSING_PRODUCT = auto()
    EVALUATING = auto()
    FALLBACK = auto()
    COMPLETE = auto()
    ERROR = auto()
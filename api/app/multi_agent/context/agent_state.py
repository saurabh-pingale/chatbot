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

    @property
    def is_processing_state(self):
        """Returns True if this is a processing state that can be returned to during evaluation"""
        return self.name.startswith('PROCESSING_')

    @property
    def classification_type(self):
        """return the classification type for processing states"""
        if self.is_processing_state:
            return self.name.split('_')[-1].lower()
        return None
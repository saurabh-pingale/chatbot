from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from datetime import datetime

@dataclass
class AgentContext:
    """Context object passed between agents during processing"""
    user_message: str
    classification: Optional[str] = None
    response: Optional[str] = None
    products: List[Dict[str, Any]] = None
    categories: List[Dict[str, Any]] = None
    quality_score: Optional[float] = None
    attempts: int = 0
    max_attempts: int = 3
    namespace: str = "" 
    metadata: Dict[str, Any] = None
    feedback_history: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.products is None:
            self.products = []
        if self.categories is None:
            self.categories = []
        if self.metadata is None:
            self.metadata = {}
        if self.feedback_history is None:
            self.feedback_history = []

    def add_feedback(self, agent_name: str, quality_score: float, feedback: str):
        """Add feedback to the feedback history"""
        self.feedback_history.append({
            "agent": agent_name,
            "quality_score": quality_score,
            "feedback": feedback,
            "timestamp": datetime.now().isoformat(),
            "attempt": self.attempts
        })
import os
from langfuse import Langfuse
from langfuse.decorators import observe
from typing import Dict, Any, Optional

class LangfuseTracker:
    _instance = None

    def __new__(cls):
        if not cls._instance:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        try:
            self.client = Langfuse(
                public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
                secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
                host="https://cloud.langfuse.com"
            )
        except Exception as e:
            print(f"Langfuse initialization error: {e}")
            self.client = None

    @observe()
    def track_llm_response(
        self, 
        prompt: str, 
        response: str, 
        metadata: Optional[Dict[str, Any]] = None
    ):
        if not self.client:
            return

        trace = self.client.trace(
            name="llm_response_generation",
            input=prompt,
            output=response
        )

        if metadata:
            trace.update(metadata=metadata)

        return trace

    def calculate_token_efficiency(
        self, 
        response: str, 
        max_tokens: int = 200
    ) -> Dict[str, float]:
        tokens = response.split()
        return {
            "total_tokens_generated": len(tokens),
            "max_tokens_allowed": max_tokens,
            "efficiency_percentage": min(100, (len(tokens) / max_tokens) * 100)
        }

langfuse_tracker = LangfuseTracker()
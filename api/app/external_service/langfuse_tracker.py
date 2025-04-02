from app.external_service.langfuse_observations import langfuse_tracker

def track_llm_interaction(prompt: str, response: str, user_message: str):
    token_efficiency = langfuse_tracker.calculate_token_efficiency(response)
    
    langfuse_tracker.track_llm_interaction(
        prompt=prompt, 
        response=response, 
        metadata={
            "user_message": user_message,
            "token_efficiency": token_efficiency
        }
    )

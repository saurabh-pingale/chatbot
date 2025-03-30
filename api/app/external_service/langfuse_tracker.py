from app.external_service.langfuse_observations import langfuse_tracker

#TODO - Is it LLM usage or response usage or is this correct naming ?
def track_llm_response(prompt: str, response: str, user_message: str):
    token_efficiency = langfuse_tracker.calculate_token_efficiency(response)
    
    langfuse_tracker.track_llm_response(
        prompt=prompt, 
        response=response, 
        metadata={
            "user_message": user_message,
            "token_efficiency": token_efficiency
        }
    )

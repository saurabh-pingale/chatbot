async def process_agent_conversation(app, user_message, shop_id, shop_id_key, previous_messages, user_id, guest_id, is_guest):
    """Handles the full agent response and logs the conversation."""
    print(f"Shop ID in Process Agent Conversation: {shop_id}")
    agent_response = await app.llm_service.handle_user_message(user_message, shop_id, previous_messages)

    conversation_log_data = {
        "user_query": user_message,
        "agent_response": agent_response.get('answer'),
        "user_id": user_id,
        "shop_id": shop_id_key,
    }
    if is_guest:
        conversation_log_data["guest_id"] = guest_id

    await app.conversation_service.record_conversation_into_db(conversation_log_data)

    return agent_response
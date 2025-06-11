def get_last_user_message_content(messages: list[dict[str, any]]) -> str | None:
    last_user_message_obj = next(
        (msg for msg in reversed(messages) if msg.get("role") == "user"),
        None
    )
    return last_user_message_obj.get("content") if last_user_message_obj else None
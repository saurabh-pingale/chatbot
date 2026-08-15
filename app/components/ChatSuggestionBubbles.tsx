import React from "react";
import type { ChatSuggestion } from "../utils/chat-flow.utils";

interface ChatSuggestionBubblesProps {
  suggestions: ChatSuggestion[];
  disabled?: boolean;
  onSelect: (suggestion: ChatSuggestion) => void;
  align?: "left" | "right";
}

export default function ChatSuggestionBubbles({
  suggestions,
  disabled = false,
  onSelect,
  align = "right",
}: ChatSuggestionBubblesProps) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 8,
      }}
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
          style={{
            appearance: "none",
            border: "2px solid #000000",
            background: "transparent",
            color: "#000000",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.2,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "background 0.2s ease, color 0.2s ease",
          }}
          onMouseEnter={(event) => {
            if (disabled) return;
            event.currentTarget.style.background = "#000000";
            event.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "transparent";
            event.currentTarget.style.color = "#000000";
          }}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

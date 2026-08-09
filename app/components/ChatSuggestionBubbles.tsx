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
        flexDirection: "column",
        alignItems: align === "right" ? "flex-end" : "flex-start",
        gap: 8,
        marginTop: 4,
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
            border: "1.5px solid #2c6ecb",
            background: "#ffffff",
            color: "#2c6ecb",
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.2,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.55 : 1,
            transition: "background 0.15s ease, color 0.15s ease, transform 0.1s ease",
            maxWidth: "85%",
            textAlign: "center",
          }}
          onMouseEnter={(event) => {
            if (disabled) return;
            event.currentTarget.style.background = "#eef4ff";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "#ffffff";
          }}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

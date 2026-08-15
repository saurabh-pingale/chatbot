import React from "react";
import { Text } from "@shopify/polaris";
import type { ChatMessage, ChatSuggestion } from "../utils/chat-flow.utils";
import ChatSuggestionBubbles from "./ChatSuggestionBubbles";

function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        margin: "8px 0",
        opacity: 0.8,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          margin: "0 2px",
          backgroundColor: "#495057",
          borderRadius: "50%",
          animation: "typingDot 1.4s infinite ease-in-out",
          animationDelay: "0s",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          margin: "0 2px",
          backgroundColor: "#495057",
          borderRadius: "50%",
          animation: "typingDot 1.4s infinite ease-in-out",
          animationDelay: "0.2s",
        }}
      />
      <span
        style={{
          width: 8,
          height: 8,
          margin: "0 2px",
          backgroundColor: "#495057",
          borderRadius: "50%",
          animation: "typingDot 1.4s infinite ease-in-out",
          animationDelay: "0.4s",
        }}
      />
    </div>
  );
}

interface ChatResultListProps {
  messages: ChatMessage[];
  showLoading: boolean;
  isSyncing: boolean;
  isFetchingCategory: boolean;
  suggestions?: ChatSuggestion[];
  suggestionsDisabled?: boolean;
  onSuggestion?: (suggestion: ChatSuggestion) => void;
  helperText?: string;
}

function ProductCard({
  product,
  index = 0,
}: {
  product: NonNullable<ChatMessage["products"]>[number];
  index?: number;
}) {
  const imageUrl = product.image_url || "https://placehold.co/320x240/e5e7eb/6b7280?text=No+Image";
  const inStock = (product.variant_quantity ?? 0) > 0;

  // Convert currency code to symbol
  const getCurrencySymbol = (currencyCode: string): string => {
    try {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(0)
        .replace(/\d/g, '')
        .trim();
    } catch {
      return currencyCode;
    }
  };

  const formattedPrice =
    product.price !== undefined && product.price !== null && product.price !== 0
      ? `${getCurrencySymbol(product.currency_code || '')}${Number(product.price).toFixed(2)}`
      : null;

  return (
    <article
      className={inStock ? "product-card-animated" : "product-card-animated-out-of-stock"}
      style={{
        flex: "0 0 180px",
        minWidth: 180,
        maxWidth: 180,
        display: "flex",
        flexDirection: "column",
        borderRadius: 12,
        overflow: "hidden",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        filter: !inStock ? "grayscale(60%)" : "none",
        scrollSnapAlign: "start",
        animationDelay: `${index * 0.05}s`,
      }}
    >
      <img
        src={imageUrl}
        alt={product.title}
        style={{
          width: "100%",
          height: 130,
          objectFit: "cover",
          display: "block",
          borderBottom: "1px solid #e9ecef",
        }}
      />

      <div style={{ padding: "10px 12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <h4
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "#000000",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.4,
            textTransform: "capitalize",
          }}
        >
          {product.title}
        </h4>

        {formattedPrice && (
          <div style={{ fontSize: 14, fontWeight: 700, color: "#000000", letterSpacing: "-0.2px", textAlign: "center" }}>
            {formattedPrice}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 500,
              lineHeight: 1.6,
              whiteSpace: "nowrap",
              background: inStock ? "#495057" : "#dee2e6",
              color: inStock ? "#ffffff" : "#6c757d",
            }}
          >
            {inStock ? `${product.variant_quantity} in stock` : "Out of stock"}
          </span>
        </div>

        <a
          href={!inStock ? undefined : product.url}
          target="_blank"
          rel="noreferrer"
          className="product-view-button"
          aria-disabled={!inStock}
          style={{
            display: "block",
            width: "100%",
            padding: "7px 8px",
            background: "#e9ecef",
            color: "#495057",
            textAlign: "center",
            textDecoration: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            marginTop: 4,
            transition: "background-color 0.2s, color 0.2s",
            boxSizing: "border-box",
            opacity: !inStock ? 0.45 : 1,
            cursor: !inStock ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (inStock) {
              e.currentTarget.style.background = "#dee2e6";
              e.currentTarget.style.color = "#000000";
            }
          }}
          onMouseLeave={(e) => {
            if (inStock) {
              e.currentTarget.style.background = "#e9ecef";
              e.currentTarget.style.color = "#495057";
            }
          }}
          onClick={(e) => !inStock && e.preventDefault()}
        >
          View
        </a>
      </div>
    </article>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <Text as="span" variant="bodySm" tone="subdued">
        ReezoAI Assist
      </Text>
      <div
        style={{
          background: "#495057",
          color: "#ffffff",
          borderRadius: "12px",
          padding: "12px 16px",
          maxWidth: "88%",
        }}
      >
        <Text as="p" variant="bodyMd">
          <span style={{ color: "#ffffff" }}>{text}</span>
        </Text>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        alignSelf: "flex-end",
        background: "#111827",
        color: "#ffffff",
        borderRadius: "16px 16px 4px 16px",
        padding: "10px 16px",
        maxWidth: "75%",
      }}
    >
      <Text as="p" variant="bodyMd" fontWeight="medium">
        <span style={{ color: "#ffffff" }}>{text}</span>
      </Text>
    </div>
  );
}

export default function ChatResultList({
  messages,
  showLoading,
  isSyncing,
  isFetchingCategory,
  suggestions = [],
  suggestionsDisabled = false,
  onSuggestion,
  helperText,
}: ChatResultListProps) {
  if (showLoading && !messages.length) {
    return (
      <div
        style={{
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        <TypingIndicator />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <BotBubble text="Hey there, I'm happy to help you today." />
        {suggestions.length > 0 && (
          <div>
            <ChatSuggestionBubbles
              suggestions={suggestions}
              disabled={suggestionsDisabled}
              onSelect={onSuggestion || (() => {})}
              align="left"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes fadeInUpOutOfStock {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 0.65;
              transform: translateY(0);
            }
          }
          @keyframes typingDot {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
          .product-card-animated {
            opacity: 0;
            animation: fadeInUp 0.3s ease-out forwards;
          }
          .product-card-animated-out-of-stock {
            opacity: 0;
            animation: fadeInUpOutOfStock 0.3s ease-out forwards;
          }
          .product-slider-horizontal::-webkit-scrollbar {
            display: none;
          }
          .product-view-button:visited {
            color: #495057;
          }
        `}
      </style>
      {messages.map((message) => (
        <div key={message.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {message.role === "user" ? (
            <UserBubble text={message.text} />
          ) : (
            <>
              <BotBubble text={message.text} />
              {message.products && message.products.length > 0 ? (
                <div
                  className="product-slider-horizontal"
                  style={{
                    display: "flex",
                    gap: 16,
                    padding: "0 0 12px 0",
                    overflowX: "auto",
                    overflowY: "hidden",
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                    flexWrap: "nowrap",
                  }}
                >
                  {message.products.map((product, index) => (
                    <ProductCard key={product.product_id} product={product} index={index} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ))}

      {isFetchingCategory ? (
        <TypingIndicator />
      ) : null}

      {helperText && suggestions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <Text as="span" variant="bodySm" tone="subdued">
              {helperText}
            </Text>
          </div>
          <ChatSuggestionBubbles
            suggestions={suggestions}
            disabled={suggestionsDisabled}
            onSelect={onSuggestion || (() => {})}
            align="left"
          />
        </div>
      )}
    </div>
  );
}

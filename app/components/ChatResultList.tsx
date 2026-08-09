import React from "react";
import { Badge, Spinner, Text } from "@shopify/polaris";
import type { ChatMessage } from "../utils/chat-flow.utils";

interface ChatResultListProps {
  messages: ChatMessage[];
  showLoading: boolean;
  isSyncing: boolean;
  isFetchingCategory: boolean;
}

function ProductCard({
  product,
}: {
  product: NonNullable<ChatMessage["products"]>[number];
}) {
  const description = product.description?.trim() || "No description available.";
  const imageUrl = product.image_url || "https://placehold.co/320x240/f4f6f8/94a3b8?text=No+Image";
  const inStock = (product.variant_quantity ?? 0) > 0;

  return (
    <article
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 14,
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.08)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        minWidth: 0,
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          background: "#f8fafc",
          overflow: "hidden",
        }}
      >
        <img
          src={imageUrl}
          alt={product.title}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>

      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <Text as="h3" variant="headingSm" fontWeight="semibold">
          {product.title}
        </Text>

        <div
          style={{
            color: "#64748b",
            fontSize: 13,
            lineHeight: 1.45,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 2 }}>
          {product.category_name ? <Badge tone="info">{product.category_name}</Badge> : null}
          <Badge tone={inStock ? "success" : "warning"}>
            {inStock ? `${product.variant_quantity} in stock` : "Out of stock"}
          </Badge>
        </div>

        {product.url ? (
          <a
            href={product.url}
            target="_blank"
            rel="noreferrer"
            style={{
              marginTop: 4,
              color: "#2c6ecb",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View on storefront →
          </a>
        ) : null}
      </div>
    </article>
  );
}

function BotBubble({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <Text as="span" variant="bodySm" tone="subdued">
        Catalog Assistant
      </Text>
      <div
        style={{
          background: "#f4f6f8",
          borderRadius: "16px 16px 16px 4px",
          padding: "14px 18px",
          maxWidth: "88%",
        }}
      >
        <Text as="p" variant="bodyMd">
          {text}
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
}: ChatResultListProps) {
  if (showLoading && !messages.length) {
    return (
      <div
        style={{
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
        }}
      >
        <Spinner size="large" />
        <Text as="p" variant="bodyMd" tone="subdued">
          {isSyncing ? "Syncing products from Shopify..." : "Loading catalog..."}
        </Text>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div
        style={{
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 10,
          padding: 28,
        }}
      >
        <div style={{ fontSize: 28 }}>👋</div>
        <Text as="p" variant="headingSm">
          Welcome to your catalog assistant
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Tap a greeting below to browse products by category. No typing required.
        </Text>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {messages.map((message) => (
        <div key={message.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {message.role === "user" ? (
            <UserBubble text={message.text} />
          ) : (
            <>
              <BotBubble text={message.text} />
              {message.products && message.products.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: 14,
                    width: "100%",
                  }}
                >
                  {message.products.map((product) => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ))}

      {isFetchingCategory ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
          <Spinner size="small" />
          <Text as="span" variant="bodySm" tone="subdued">
            Loading products...
          </Text>
        </div>
      ) : null}
    </div>
  );
}

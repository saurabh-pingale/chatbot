import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeShopifyProduct,
  toDisplayProduct,
  type ProductRecord,
  type ShopifyProductNode,
} from "../utils/product.utils";
import { fetchShopCategories, upsertShopCategories } from "../db/category.db";
import {
  fetchProductsByCategoryId,
  fetchShopProducts,
  upsertShopProducts,
} from "../db/product.db";
import { isSupabaseConfigured } from "../utils/supabase.config";
import type { ShopCategoryRow, ShopProductRow } from "../utils/supabase.types";
import {
  BROWSE_ALL_SUGGESTION,
  buildCategorySuggestions,
  buildOtherCategorySuggestions,
  getBrowseAllIntro,
  getCategoriesIntro,
  getCategoryProductsIntro,
  getGreetingResponse,
  getOtherCategoriesPrompt,
  GREETING_SUGGESTIONS,
  type ChatFlowStep,
  type ChatMessage,
  type ChatSuggestion,
} from "../utils/chat-flow.utils";
import { detectGreeting, getGreetingTypeMessage } from "../utils/greeting.utils";

interface UseProductSyncManagerOptions {
  shop: string | null;
  supabaseUrl: string;
  supabaseKey: string;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapRowsToProducts(rows: ShopProductRow[]): ProductRecord[] {
  return rows.map((row) => toDisplayProduct(row));
}

export function useProductSyncManager({
  shop,
  supabaseUrl,
  supabaseKey,
}: UseProductSyncManagerOptions) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [products, setProducts] = useState<ShopProductRow[]>([]);
  const [categories, setCategories] = useState<ShopCategoryRow[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStep, setChatStep] = useState<ChatFlowStep>("welcome");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetchingCategory, setIsFetchingCategory] = useState(false);
  const [syncTotal, setSyncTotal] = useState<number | null>(null);
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const configMissing = !isSupabaseConfigured({
    url: supabaseUrl,
    publishableKey: supabaseKey,
  });

  useEffect(() => {
    if (configMissing || typeof window === "undefined") {
      setSupabase(null);
      return;
    }

    let cancelled = false;
    import("../utils/supabase.browser").then(({ createBrowserSupabaseClient }) => {
      if (!cancelled) {
        setSupabase(createBrowserSupabaseClient(supabaseUrl, supabaseKey));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [configMissing, supabaseUrl, supabaseKey]);

  const loadCatalog = useCallback(async () => {
    if (!shop || !supabase) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [productRows, categoryRows] = await Promise.all([
        fetchShopProducts(supabase, shop),
        fetchShopCategories(supabase, shop),
      ]);
      setProducts(productRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog.");
    } finally {
      setIsLoading(false);
    }
  }, [shop, supabase]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const suggestions = useMemo((): ChatSuggestion[] => {
    if (chatStep === "welcome") {
      return GREETING_SUGGESTIONS;
    }

    if (chatStep === "categories") {
      return buildCategorySuggestions(categories);
    }

    if (chatStep === "category_products" && activeCategoryId) {
      return buildOtherCategorySuggestions(categories, activeCategoryId);
    }

    return [];
  }, [activeCategoryId, categories, chatStep]);

  const appendMessage = useCallback((message: Omit<ChatMessage, "id">) => {
    setChatMessages((prev) => [...prev, { ...message, id: createMessageId() }]);
  }, []);

  const showCategoriesStep = useCallback(() => {
    setChatStep("categories");
    appendMessage({
      role: "bot",
      text: getCategoriesIntro(categories.length),
    });
  }, [appendMessage, categories.length]);

  const handleGreeting = useCallback(() => {
    setActiveCategoryId(null);
    setChatStep("categories");
    appendMessage({
      role: "bot",
      text: getGreetingResponse(),
    });
    appendMessage({
      role: "bot",
      text: getCategoriesIntro(categories.length),
    });
  }, [appendMessage, categories.length]);

  const handleBrowseAll = useCallback(() => {
    setActiveCategoryId(null);
    setChatStep("categories");
    appendMessage({
      role: "bot",
      text: getBrowseAllIntro(categories.length),
    });
  }, [appendMessage, categories.length]);

  const handleCategorySelect = useCallback(
    async (categoryId: string, categoryName: string) => {
      if (!supabase || !shop) {
        return;
      }

      setActiveCategoryId(categoryId);
      setChatStep("category_products");
      setIsFetchingCategory(true);
      setError("");

      try {
        const rows = await fetchProductsByCategoryId(supabase, shop, categoryId);
        const displayProducts = mapRowsToProducts(rows);

        appendMessage({
          role: "bot",
          text: getCategoryProductsIntro(categoryName, displayProducts.length),
          products: displayProducts,
        });

        if (categories.length > 1) {
          appendMessage({
            role: "bot",
            text: getOtherCategoriesPrompt(),
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load category products.");
      } finally {
        setIsFetchingCategory(false);
      }
    },
    [appendMessage, categories.length, shop, supabase],
  );

  const handleSuggestion = useCallback(
    async (suggestion: ChatSuggestion) => {
      appendMessage({ role: "user", text: suggestion.label });

      if (suggestion.type === "greeting") {
        handleGreeting();
        return;
      }

      if (suggestion.type === "browse_all") {
        handleBrowseAll();
        return;
      }

      if (suggestion.type === "category" && suggestion.categoryId) {
        const category = categories.find((item) => item.id === suggestion.categoryId);
        if (!category) {
          setError("That category is no longer available. Try syncing products again.");
          return;
        }
        await handleCategorySelect(category.id, category.name);
      }
    },
    [appendMessage, categories, handleBrowseAll, handleCategorySelect, handleGreeting],
  );

  const handleQuickSearch = useCallback(
    async (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed) {
        return;
      }

      const greeting = detectGreeting(trimmed);
      if (greeting.isGreeting) {
        appendMessage({ role: "user", text: trimmed });
        const typeMessage = getGreetingTypeMessage(greeting.greetingType);
        if (typeMessage) {
          appendMessage({ role: "bot", text: typeMessage });
        }
        handleGreeting();
        return;
      }

      const matchedCategory = categories.find(
        (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (matchedCategory) {
        appendMessage({ role: "user", text: trimmed });
        await handleCategorySelect(matchedCategory.id, matchedCategory.name);
        return;
      }

      appendMessage({ role: "user", text: trimmed });
      appendMessage({
        role: "bot",
        text: "Tap a suggestion below to browse by category. Say hi to start over.",
      });
      setChatStep(categories.length ? "categories" : "welcome");
    },
    [appendMessage, categories, handleCategorySelect, handleGreeting],
  );

  const handleSync = useCallback(async () => {
    if (!shop || !supabase) {
      return;
    }

    setIsSyncing(true);
    setError("");
    setSuccessMessage("");
    setSyncTotal(null);
    setSyncedCount(0);
    setSyncProgress(0);
    setSyncMessage("Starting product sync...");

    try {
      const response = await fetch("/shopify-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Failed to fetch products from Shopify.");
      }

      const payload = (await response.json()) as { products: ShopifyProductNode[] };
      if (!Array.isArray(payload.products)) {
        throw new Error("Invalid product payload from Shopify.");
      }

      const total = payload.products.length;
      if (total === 0) {
        setSuccessMessage("No products found in your Shopify store.");
        return;
      }

      setSyncTotal(total);
      setSyncMessage(`Syncing ${total} products...`);

      const normalizedProducts = payload.products.map(normalizeShopifyProduct);
      const uniqueCategoryNames = Array.from(
        new Set(normalizedProducts.map((product) => product.category_name ?? "Miscellaneous")),
      );

      setSyncMessage("Saving categories...");
      const categoryRows = await upsertShopCategories(supabase, shop, uniqueCategoryNames);
      const categoryIdByName = new Map(categoryRows.map((row) => [row.name, row.id]));

      const records: ProductRecord[] = [];
      for (let index = 0; index < normalizedProducts.length; index += 1) {
        const product = normalizedProducts[index];
        const categoryName = product.category_name ?? "Miscellaneous";
        records.push({
          ...product,
          category_id: categoryIdByName.get(categoryName) ?? null,
        });

        const processed = index + 1;
        setSyncedCount(processed);
        setSyncProgress(Math.round((processed / total) * 100));
        setSyncMessage(`Processed ${processed} of ${total} products...`);
      }

      setSyncMessage("Saving products...");
      const insertedRows = await upsertShopProducts(supabase, shop, records);
      setProducts(insertedRows);
      setCategories(categoryRows);
      setSuccessMessage(`Synced ${insertedRows.length} products across ${categoryRows.length} categories.`);

      setChatMessages([]);
      setChatStep("welcome");
      setActiveCategoryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product sync failed.");
    } finally {
      setIsSyncing(false);
      setSyncTotal(null);
      setSyncedCount(0);
      setSyncProgress(0);
      setSyncMessage("");
    }
  }, [shop, supabase]);

  return {
    products,
    categories,
    chatMessages,
    chatStep,
    suggestions,
    isLoading,
    isSyncing,
    isFetchingCategory,
    syncTotal,
    syncedCount,
    syncProgress,
    syncMessage,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    configMissing,
    handleSync,
    handleSuggestion,
    handleQuickSearch,
    loadCatalog,
    browseAllSuggestion: BROWSE_ALL_SUGGESTION,
  };
}

export type { ProductRecord as ProductSearchResult };

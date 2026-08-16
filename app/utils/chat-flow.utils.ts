export type SuggestionType = "greeting" | "category" | "browse_all";

export interface ChatSuggestion {
  id: string;
  label: string;
  type: SuggestionType;
  categoryId?: string;
}

export type ChatFlowStep = "welcome" | "categories" | "category_products";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  products?: Array<{
    product_id: string;
    title: string;
    description: string;
    url: string | null;
    image_url: string | null;
    category_name: string | null;
    variant_quantity: number;
    price: number;
    currency_code: string;
  }>;
}

export const GREETING_SUGGESTIONS: ChatSuggestion[] = [
  { id: "greet-hi", label: "Hi 👋", type: "greeting" },
  { id: "greet-hello", label: "Hello", type: "greeting" },
];

export const BROWSE_ALL_SUGGESTION: ChatSuggestion = {
  id: "browse-all",
  label: "Browse all categories",
  type: "browse_all",
};

export function buildCategorySuggestions(
  categories: Array<{ id: string; name: string }>,
): ChatSuggestion[] {
  return categories.map((category) => ({
    id: `category-${category.id}`,
    label: category.name,
    type: "category" as const,
    categoryId: category.id,
  }));
}

export function buildOtherCategorySuggestions(
  categories: Array<{ id: string; name: string }>,
  activeCategoryId: string,
): ChatSuggestion[] {
  const others = categories.filter((category) => category.id !== activeCategoryId);
  return [...buildCategorySuggestions(others), BROWSE_ALL_SUGGESTION];
}

export function getGreetingResponse(): string {
  return "Hello! Welcome to store. I can help you browse products by category — pick one below to get started.";
}

export function getCategoriesIntro(categoryCount: number): string {
  if (categoryCount === 0) {
    return "I don't see any product categories yet. Sync your Shopify catalog first, then come back here to browse.";
  }

  if (categoryCount === 1) {
    return "Here is the available category in your store:";
  }

  return `Here are the ${categoryCount} categories available in your store:`;
}

export function getCategoryProductsIntro(categoryName: string, productCount: number): string {
  if (productCount === 0) {
    return `Sorry, we don't have any products in ${categoryName} right now.`;
  }

  return `Here are products in ${categoryName}:`;
}

export function getOtherCategoriesPrompt(): string {
  return "Want to keep exploring? Check out other categories or browse everything again.";
}

export function getBrowseAllIntro(categoryCount: number): string {
  return getCategoriesIntro(categoryCount);
}

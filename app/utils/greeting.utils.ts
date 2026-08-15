/**
 * Lightweight greeting detection for the auto-suggestion chat flow.
 */

export interface GreetingDetectionResult {
  isGreeting: boolean;
  greetingType?: "greeting" | "farewell" | "thanks" | "bot_info";
  matchedKeyword?: string;
}

const GREETING_WORDS = ["hi", "hello", "hola", "hey", "heyy", "hallo", "greetings", "howdy", "namaste", "sup", "yo"];
const FAREWELL_WORDS = ["bye", "goodbye", "cya", "adios", "chao", "farewell", "see ya"];
const THANKS_WORDS = ["thanks", "thank you", "thx", "ty", "cheers"];

const MULTIWORD_GREETINGS = [
  "good morning",
  "good afternoon",
  "good evening",
  "hi there",
  "hello there",
  "hey there",
  "what can you do",
  "who are you",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ");
}

export function detectGreeting(query: string): GreetingDetectionResult {
  const normalized = normalizeText(query);
  if (!normalized) {
    return { isGreeting: false };
  }

  for (const phrase of MULTIWORD_GREETINGS) {
    if (normalized === phrase || normalized.startsWith(phrase)) {
      return {
        isGreeting: true,
        greetingType: phrase === "who are you" || phrase === "what can you do" ? "bot_info" : "greeting",
        matchedKeyword: phrase,
      };
    }
  }

  const tokens = normalized.split(" ");
  if (tokens.length <= 3) {
    for (const token of tokens) {
      if (GREETING_WORDS.includes(token)) {
        return { isGreeting: true, greetingType: "greeting", matchedKeyword: token };
      }
      if (FAREWELL_WORDS.includes(token)) {
        return { isGreeting: true, greetingType: "farewell", matchedKeyword: token };
      }
      if (THANKS_WORDS.includes(token)) {
        return { isGreeting: true, greetingType: "thanks", matchedKeyword: token };
      }
    }
  }

  return { isGreeting: false };
}

export function getGreetingTypeMessage(greetingType?: GreetingDetectionResult["greetingType"]): string {
  switch (greetingType) {
    case "farewell":
      return "Goodbye! Come back anytime you want to browse the catalog.";
    case "thanks":
      return "You're welcome! Let me know if you'd like to explore another category.";
    case "bot_info":
      return "I'm your Assist. I help you browse products by category — no search, just give a tap.";
    default:
      return "";
  }
}

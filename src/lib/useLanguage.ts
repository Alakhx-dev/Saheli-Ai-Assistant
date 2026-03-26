import en from "@/i18n/en";
import hi from "@/i18n/hi";
import hinglish from "@/i18n/hinglish";

export type UiLanguage = "english" | "hindi" | "hinglish";

export const UI_LANGUAGE_STORAGE_KEY = "app_language";

const DICTIONARIES = {
  english: en,
  hindi: hi,
  hinglish,
} as const;

export function getStoredLanguage(): UiLanguage {
  if (typeof window === "undefined") {
    return "hinglish";
  }

  const lang = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  if (lang === "english" || lang === "hindi" || lang === "hinglish") {
    return lang;
  }

  return "hinglish";
}

export function getLang(language: UiLanguage = getStoredLanguage()) {
  return DICTIONARIES[language] ?? hinglish;
}

export function formatText(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));
}

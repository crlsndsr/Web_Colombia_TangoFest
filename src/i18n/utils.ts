import es from "./es.json";
import en from "./en.json";

export type Lang = "es" | "en";

const translations = { es, en } as const;

/**
 * Returns the full translations object for the given language.
 * Usage: const t = useTranslations(lang);
 *        t.hero.title
 */
export function useTranslations(lang: Lang) {
  return translations[lang];
}

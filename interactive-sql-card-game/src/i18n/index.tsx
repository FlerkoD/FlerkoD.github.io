"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, type DictKey } from "./en";
import { ru } from "./ru";

/**
 * Locale registry. To add a language later:
 *   1. create `src/i18n/<id>.ts` exporting `Record<DictKey, string>`
 *   2. add it to LOCALES + DICTS below
 *   3. (optional) add `<id>` keys to content LText objects — missing ones fall back to English.
 */
export const LOCALES = [
  { id: "en", label: "EN", name: "English" },
  { id: "ru", label: "RU", name: "Русский" },
] as const;

export type Locale = (typeof LOCALES)[number]["id"];

const DICTS: Record<Locale, Record<DictKey, string>> = { en, ru };

/** localized content text — English is mandatory, everything else optional */
export type LText = { en: string } & Partial<Record<Locale, string>>;

export function tx(text: LText | string | undefined, locale: Locale): string {
  if (text == null) return "";
  if (typeof text === "string") return text;
  return text[locale] ?? text.en;
}

export type TFn = (key: DictKey, vars?: Record<string, string | number>) => string;

export function translate(locale: Locale, key: DictKey, vars?: Record<string, string | number>) {
  let s = DICTS[locale]?.[key] ?? en[key] ?? key;
  if (vars) for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: TFn };

const I18nCtx = createContext<Ctx>({
  locale: "en",
  setLocale: () => {},
  t: (k, v) => translate("en", k, v),
});

const KEY = "qc.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Locale | null;
    if (saved && LOCALES.some((l) => l.id === saved)) setLocaleState(saved);
    else if (navigator.language?.toLowerCase().startsWith("ru")) setLocaleState("ru");
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<TFn>((k, v) => translate(locale, k, v), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
export type { DictKey };

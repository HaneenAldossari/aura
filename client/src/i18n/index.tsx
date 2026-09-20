/**
 * Locale plumbing: one provider, one hook, one place that owns `dir`.
 *
 * Deliberately not i18next. The app has one catalogue, two locales and no
 * pluralisation rules beyond what a template can express, so a library would be
 * 40 KB of machinery to do `obj[key] ?? fallback`. What it would buy — lazy
 * catalogue loading — is worth revisiting only once Arabic is actually written.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "./en";
import { ar } from "./ar";
import type { Catalogue, DeepPartial, Key, Locale, Vars } from "./types";

const CATALOGUES: Record<Locale, Catalogue | DeepPartial<Catalogue>> = { en, ar };

export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(["ar"]);

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

const STORAGE_KEY = "aura:locale";

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

/**
 * ?lang= first, then the stored choice, then the browser, then English.
 *
 * The query parameter exists because there is no locale switcher in the UI yet
 * — the screens it would live on are still being built — and a scaffold nobody
 * can exercise is a scaffold nobody finds the bugs in. It also sticks, so
 * ?lang=ar once is enough to browse the whole app in Arabic on a phone.
 *
 * Only the language subtag is matched: ar-EG, ar-SA and ar all mean the same
 * catalogue here, and there is no regional variant to choose between.
 */
export function detectLocale(): Locale {
  try {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(requested)) {
      localStorage.setItem(STORAGE_KEY, requested);
      return requested;
    }
  } catch {
    // No window, or storage refused the write — the choice still applies now.
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (isLocale(requested)) return requested;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Blocked storage is not a reason to fail to render.
  }
  if (typeof navigator !== "undefined") {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const base = tag?.split("-")[0];
      if (isLocale(base)) return base;
    }
  }
  return "en";
}

/** Walk a dotted path. Returns undefined rather than throwing on a gap. */
function lookup(source: unknown, path: string): string | undefined {
  let node: unknown = source;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole
  );
}

/**
 * Resolve a key in `locale`, falling back to English.
 *
 * Exported unbound so tests and non-React code (the PNG palette export, for
 * one) can translate without a provider.
 */
export function translate(locale: Locale, key: Key, vars?: Vars): string {
  const hit = lookup(CATALOGUES[locale], key) ?? lookup(en, key);
  if (hit === undefined) {
    // A key that resolves in neither catalogue is a bug, not a missing
    // translation. Showing the key is louder than showing nothing.
    if (import.meta.env.DEV) console.warn(`[i18n] no string for "${key}"`);
    return key;
  }
  return fill(hit, vars);
}

export interface I18n {
  locale: Locale;
  dir: "ltr" | "rtl";
  isRTL: boolean;
  setLocale: (next: Locale) => void;
  t: (key: Key, vars?: Vars) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function LocaleProvider({
  children,
  initial,
}: {
  children: ReactNode;
  /** Test seam — production detects. */
  initial?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => initial ?? detectLocale());

  // The document attributes are the whole of RTL layout: every rule in the CSS
  // is logical, so flipping `dir` mirrors the app without a second stylesheet.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dirFor(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Choice lasts the session instead of persisting. Acceptable.
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      dir: dirFor(locale),
      isRTL: RTL_LOCALES.has(locale),
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n called outside LocaleProvider");
  return ctx;
}

/** Sugar for the common case, where only the function is wanted. */
export function useT(): I18n["t"] {
  return useI18n().t;
}

export type { Locale, Key };

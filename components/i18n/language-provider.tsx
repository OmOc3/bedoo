"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getI18nMessages,
  getLocaleDirection,
  getLocaleFromValue,
  getPestTypeLabels,
  getRoleLabels,
  getStatusOptionLabels,
  localeCookieName,
  type I18nMessages,
  type Locale,
  type LocaleDirection,
} from "@/lib/i18n";
import { hasArabicText, translateArabicText } from "@/lib/i18n/dom-translations";

interface LanguageContextValue {
  direction: LocaleDirection;
  locale: Locale;
  messages: I18nMessages;
  pestTypeLabels: ReturnType<typeof getPestTypeLabels>;
  roleLabels: ReturnType<typeof getRoleLabels>;
  statusOptionLabels: ReturnType<typeof getStatusOptionLabels>;
  setLocale: (locale: Locale) => void;
  translate: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${localeCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

const skippedTranslationTags = new Set(["CODE", "KBD", "NOSCRIPT", "PRE", "SAMP", "SCRIPT", "STYLE", "TEXTAREA"]);
const translatableAttributeNames = ["alt", "aria-description", "aria-label", "aria-valuetext", "placeholder", "title"] as const;
const formButtonTypes = new Set(["button", "reset", "submit"]);
const originalTextContent = new WeakMap<Text, string>();
const originalAttributeValues = new WeakMap<Element, Map<string, string>>();

function getElementForNode(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function shouldSkipTranslation(node: Node): boolean {
  const element = getElementForNode(node);

  for (let current = element; current; current = current.parentElement) {
    if (
      skippedTranslationTags.has(current.tagName) ||
      current.hasAttribute("data-no-translate") ||
      current.getAttribute("translate") === "no" ||
      current.classList.contains("notranslate")
    ) {
      return true;
    }
  }

  return false;
}

function rememberAttributeValue(element: Element, attributeName: string, value: string): void {
  const existingValues = originalAttributeValues.get(element) ?? new Map<string, string>();
  existingValues.set(attributeName, value);
  originalAttributeValues.set(element, existingValues);
}

function translatePreservingWhitespace(value: string): string {
  if (!hasArabicText(value)) {
    return value;
  }

  const leadingWhitespace = value.match(/^\s*/u)?.[0] ?? "";
  const trailingWhitespace = value.match(/\s*$/u)?.[0] ?? "";
  const text = value.slice(leadingWhitespace.length, value.length - trailingWhitespace.length);

  if (!hasArabicText(text)) {
    return value;
  }

  return `${leadingWhitespace}${translateArabicText(text)}${trailingWhitespace}`;
}

function translateTextNodeToEnglish(node: Text): void {
  if (shouldSkipTranslation(node)) {
    return;
  }

  const value = node.nodeValue ?? "";

  if (!hasArabicText(value)) {
    return;
  }

  originalTextContent.set(node, value);
  node.nodeValue = translatePreservingWhitespace(value);
}

function translateFormButtonValueToEnglish(element: Element): void {
  if (!(element instanceof HTMLInputElement) || !formButtonTypes.has(element.type)) {
    return;
  }

  const value = element.value;

  if (!hasArabicText(value)) {
    return;
  }

  rememberAttributeValue(element, "value", value);
  element.value = translateArabicText(value);
  element.setAttribute("value", element.value);
}

function translateElementToEnglish(element: Element): void {
  if (shouldSkipTranslation(element)) {
    return;
  }

  if (element.getAttribute("dir") === "rtl") {
    rememberAttributeValue(element, "dir", "rtl");
    element.setAttribute("dir", "ltr");
  }

  for (const attributeName of translatableAttributeNames) {
    const value = element.getAttribute(attributeName);

    if (!value || !hasArabicText(value)) {
      continue;
    }

    rememberAttributeValue(element, attributeName, value);
    element.setAttribute(attributeName, translatePreservingWhitespace(value));
  }

  translateFormButtonValueToEnglish(element);
}

function translateSubtreeToEnglish(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNodeToEnglish(root as Text);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const element = root as Element;

    if (shouldSkipTranslation(element)) {
      return;
    }

    translateElementToEnglish(element);
  }

  for (let child = root.firstChild; child; child = child.nextSibling) {
    translateSubtreeToEnglish(child);
  }
}

function restoreSubtreeTranslations(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const originalValue = originalTextContent.get(root as Text);

    if (originalValue !== undefined) {
      root.nodeValue = originalValue;
    }

    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const element = root as Element;
    const originalAttributes = originalAttributeValues.get(element);

    if (originalAttributes) {
      for (const [attributeName, value] of originalAttributes) {
        element.setAttribute(attributeName, value);

        if (attributeName === "value" && element instanceof HTMLInputElement) {
          element.value = value;
        }
      }
    }
  }

  for (let child = root.firstChild; child; child = child.nextSibling) {
    restoreSubtreeTranslations(child);
  }
}

export function LanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocaleFromValue(initialLocale));
  const direction = getLocaleDirection(locale);
  const messages = useMemo(() => getI18nMessages(locale), [locale]);
  const pestTypeLabels = useMemo(() => getPestTypeLabels(locale), [locale]);
  const roleLabels = useMemo(() => getRoleLabels(locale), [locale]);
  const statusOptionLabels = useMemo(() => getStatusOptionLabels(locale), [locale]);

  useEffect(() => {
    setLocaleState(getLocaleFromValue(initialLocale));
  }, [initialLocale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    writeLocaleCookie(nextLocale);
  }, []);

  const translate = useCallback(
    (value: string) => {
      return locale === "en" ? translateArabicText(value) : value;
    },
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
    document.documentElement.dataset.locale = locale;
  }, [direction, locale]);

  useEffect(() => {
    const root = document.documentElement;

    if (locale !== "en") {
      restoreSubtreeTranslations(root);
      delete root.dataset.translationReady;
      return;
    }

    delete root.dataset.translationReady;
    translateSubtreeToEnglish(root);
    root.dataset.translationReady = "true";

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateSubtreeToEnglish(mutation.target);
          continue;
        }

        if (mutation.type === "attributes") {
          translateSubtreeToEnglish(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          translateSubtreeToEnglish(node);
        });
      }
    });

    observer.observe(root, {
      attributeFilter: [...translatableAttributeNames, "dir", "value"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [locale]);

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      direction,
      locale,
      messages,
      pestTypeLabels,
      roleLabels,
      setLocale,
      statusOptionLabels,
      translate,
    }),
    [direction, locale, messages, pestTypeLabels, roleLabels, setLocale, statusOptionLabels, translate],
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return context;
}

import test from "node:test";
import assert from "node:assert/strict";
import { getI18nMessages } from "../lib/i18n.ts";
import { hasArabicText, translateArabicText } from "../lib/i18n/dom-translations.ts";

test("translateArabicText maps newly covered hardcoded UI phrases", () => {
  assert.equal(translateArabicText("إخفاء من العميل"), "Hide from client");
  assert.equal(translateArabicText("الموقع تحت الصيانة"), "The site is under maintenance");
  assert.equal(translateArabicText("بوابة العملاء"), "Client portal");
  assert.equal(translateArabicText("كل العملاء"), "All clients");
  assert.equal(translateArabicText("من تاريخ"), "From date");
  assert.equal(translateArabicText("لا توجد عمليات مطابقة للفلاتر الحالية."), "No operations match the current filters.");
  assert.equal(translateArabicText("تسجيل رش المنطقة"), "Record area spray");
});

test("translateArabicText removes Arabic glyphs for unknown Arabic text in English mode", () => {
  const translated = translateArabicText("شركة الندى");

  assert.equal(hasArabicText(translated), false);
  assert.notEqual(translated.trim(), "");
});

test("English web messages do not leak Arabic text or smart punctuation", () => {
  const messages = getI18nMessages("en");
  const arabicLeaks: string[] = [];
  const smartPunctuationLeaks: string[] = [];
  const smartPunctuationPattern = /[\u2013\u2014\u2018\u2019\u201c\u201d\u2026]/u;

  function visit(value: unknown, path: string): void {
    if (typeof value === "string") {
      if (hasArabicText(value)) {
        arabicLeaks.push(`${path}: ${value}`);
      }

      if (smartPunctuationPattern.test(value)) {
        smartPunctuationLeaks.push(`${path}: ${value}`);
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`));
      return;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
    }
  }

  visit(messages, "");

  assert.deepEqual(arabicLeaks, []);
  assert.deepEqual(smartPunctuationLeaks, []);
});

import test from "node:test";
import assert from "node:assert/strict";
import { hasArabicText, translateArabicText } from "../lib/i18n/dom-translations.ts";

test("translateArabicText maps newly covered hardcoded UI phrases", () => {
  assert.equal(translateArabicText("إخفاء من العميل"), "Hide from client");
  assert.equal(translateArabicText("الموقع تحت الصيانة"), "The site is under maintenance");
});

test("translateArabicText removes Arabic glyphs for unknown Arabic text in English mode", () => {
  const translated = translateArabicText("شركة الندى");

  assert.equal(hasArabicText(translated), false);
  assert.notEqual(translated.trim(), "");
});

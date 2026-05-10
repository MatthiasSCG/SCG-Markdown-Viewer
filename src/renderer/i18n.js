// Schlanke i18n: laedt JSON pro Sprache, ersetzt data-i18n / data-i18n-title.
'use strict';

const SUPPORTED = ['de', 'en', 'fr', 'es', 'it'];
let current = 'en';
let dict = {};

export function normalizeLocale(locale) {
  if (!locale) return 'en';
  const lc = locale.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED.includes(lc) ? lc : 'en';
}

export async function loadTranslations(lang) {
  const target = SUPPORTED.includes(lang) ? lang : 'en';
  const url = `../i18n/${target}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`i18n: ${target} nicht ladbar`);
  dict = await res.json();
  current = target;
  document.documentElement.lang = target;
}

export function setLanguage(lang) {
  current = lang;
}

export function t(key) {
  return dict[key] ?? key;
}

export function applyTranslations(root) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && dict[key] != null) el.textContent = dict[key];
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key && dict[key] != null) el.title = dict[key];
  });
}

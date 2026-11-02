'use strict';
// Loaded in <head>, before first paint, so a saved theme never flashes the wrong colours.
const THEME_KEY = 'hackertube.theme';
const systemDark = matchMedia('(prefers-color-scheme: dark)');
function savedTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}
function applyTheme() {
  document.documentElement.dataset.theme = savedTheme() || (systemDark.matches ? 'dark' : 'light');
}
applyTheme();

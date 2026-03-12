const THEME_STORAGE_KEY = '@anomalo/theme';

export function normalizeTheme(value: unknown): 'dark' | 'midnight' | 'light' {
  if (value === 'light' || value === 'midnight') return value;
  return 'dark';
}

export function getStoredTheme() {
  return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
}

export function setTheme(theme: 'dark' | 'midnight' | 'light') {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

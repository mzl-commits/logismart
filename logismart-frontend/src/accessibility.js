const defaults = { highContrast: false, colorSafe: false, reduceMotion: false };

export function applyAccessibilityPreferences(preferences) {
  const root = document.documentElement;
  root.classList.toggle('a11y-contrast', preferences.highContrast);
  root.classList.toggle('a11y-color-safe', preferences.colorSafe);
  root.classList.toggle('a11y-reduce-motion', preferences.reduceMotion);
}

export function loadAccessibilityPreferences() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('accessibilityPreferences')) }; }
  catch { return defaults; }
}

export { defaults as accessibilityDefaults };

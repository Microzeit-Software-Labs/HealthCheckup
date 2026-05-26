import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY  = 'hc-theme';
const TRANSITION_MS = 200;

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'dark'; } catch { return 'dark'; }
  });

  // Apply theme class to <html> without transition on initial render
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else                  root.classList.remove('dark');

    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggle = () => {
    const root = document.documentElement;

    // Temporarily enable CSS color transitions across the entire tree.
    // Removed after the transition completes to avoid slowing down all
    // future style changes (hovers, focus rings, etc.).
    root.classList.add('theme-switching');

    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    setTimeout(() => {
      root.classList.remove('theme-switching');
    }, TRANSITION_MS + 50); // small buffer past the CSS duration
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

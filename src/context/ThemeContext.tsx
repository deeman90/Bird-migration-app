import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: AppTheme;
  isLight: boolean;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'bma_global_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          return stored;
        }
      }
    } catch {
      // ignore
    }
    return 'dark'; // default theme is obsidian dark
  });

  const applyThemeToDOM = (activeTheme: AppTheme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (activeTheme === 'light') {
      root.classList.remove('theme-dark', 'dark');
      root.classList.add('theme-light', 'light');
      root.setAttribute('data-theme', 'light');
      body.classList.remove('theme-dark', 'dark');
      body.classList.add('theme-light', 'light');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#f8fafc');
      }
    } else {
      root.classList.remove('theme-light', 'light');
      root.classList.add('theme-dark', 'dark');
      root.setAttribute('data-theme', 'dark');
      body.classList.remove('theme-light', 'light');
      body.classList.add('theme-dark', 'dark');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', '#0b0c0d');
      }
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLight: theme === 'light',
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

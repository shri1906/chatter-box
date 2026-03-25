'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  { id: 'dark',  label: 'Dark',  icon: '🌑' },
  { id: 'light', label: 'Light', icon: '☀️'  },
  { id: 'ocean', label: 'Ocean', icon: '🌊' },
  { id: 'rose',  label: 'Rose',  icon: '🌸' },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('cb_theme') || 'dark';
    setThemeState(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem('cb_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

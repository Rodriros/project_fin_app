import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

// Light mode by default as requested
export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  toggleTheme: () => set((state) => {
    const newDark = !state.isDark;
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDark: newDark };
  }),
}));

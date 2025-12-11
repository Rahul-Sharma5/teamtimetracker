import { create } from 'zustand';
import { Employee, CompanySettings } from '../types';

interface AppState {
  currentUser: Employee | null;
  setCurrentUser: (employee: Employee | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
  companySettings: CompanySettings | null;
  setCompanySettings: (settings: CompanySettings | null) => void;
}

// Helper to safely load from localStorage
const loadUserFromStorage = (): Employee | null => {
  try {
    const stored = localStorage.getItem('teamtime_user');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load user from storage:', error);
    localStorage.removeItem('teamtime_user'); // Clear invalid data
    return null;
  }
};

// Helper to load theme
const loadThemeFromStorage = (): string => {
  try {
    return localStorage.getItem('teamtime_theme') || 'emerald';
  } catch {
    return 'emerald';
  }
};

export const useStore = create<AppState>((set) => ({
  currentUser: loadUserFromStorage(),
  setCurrentUser: (employee) => {
    try {
      if (employee) {
        localStorage.setItem('teamtime_user', JSON.stringify(employee));
      } else {
        localStorage.removeItem('teamtime_user');
      }
    } catch (e) {
      console.warn('LocalStorage unavailable', e);
    }
    set({ currentUser: employee });
  },
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  themeColor: loadThemeFromStorage(),
  setThemeColor: (color) => {
    localStorage.setItem('teamtime_theme', color);
    set({ themeColor: color });
  },
  companySettings: null,
  setCompanySettings: (settings) => set({ companySettings: settings }),
}));
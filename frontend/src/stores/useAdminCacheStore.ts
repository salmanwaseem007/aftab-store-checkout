import { create } from 'zustand';

// TTL: 30 days in milliseconds
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 2,592,000,000ms

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface AdminCacheState {
  cache: Record<string, CacheEntry<any>>;
  set: <T>(key: string, value: T) => void;
  get: <T>(key: string) => T | null;
  has: (key: string) => boolean;
  clear: () => void;
}

// Internal cache map - isolated from React state to prevent render cycles
const internalCache: Record<string, CacheEntry<any>> = {};

// Safe localStorage access
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage.getItem error:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('localStorage.setItem error:', error);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('localStorage.removeItem error:', error);
    }
  },
};

// Load initial cache from localStorage
const loadInitialCache = (): Record<string, CacheEntry<any>> => {
  const stored = safeLocalStorage.getItem('admin-cache-storage');
  if (!stored) return {};
  
  try {
    const parsed = JSON.parse(stored);
    return parsed?.state?.cache || {};
  } catch (error) {
    console.error('Failed to parse admin cache from localStorage:', error);
    return {};
  }
};

// Initialize internal cache from localStorage
Object.assign(internalCache, loadInitialCache());

// Persist cache to localStorage
const persistCache = (): void => {
  try {
    const data = JSON.stringify({
      state: { cache: internalCache },
      version: 0,
    });
    safeLocalStorage.setItem('admin-cache-storage', data);
  } catch (error) {
    console.error('Failed to persist admin cache to localStorage:', error);
  }
};

// Check if entry is expired
const isExpired = (entry: CacheEntry<any>): boolean => {
  const now = Date.now();
  const age = now - entry.timestamp;
  return age > CACHE_TTL;
};

// Clean expired entries from internal cache (non-reactive)
const cleanExpiredEntries = (): void => {
  try {
    const keys = Object.keys(internalCache);
    let hasChanges = false;

    for (const key of keys) {
      const entry = internalCache[key];
      if (entry && isExpired(entry)) {
        delete internalCache[key];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      persistCache();
    }
  } catch (error) {
    console.error('Error cleaning expired entries:', error);
  }
};

export const useAdminCacheStore = create<AdminCacheState>((set, get) => ({
  cache: {},

  set: <T,>(key: string, value: T) => {
    try {
      // Update internal cache
      internalCache[key] = {
        value,
        timestamp: Date.now(),
      };

      // Persist to localStorage
      persistCache();

      // Update Zustand state atomically (for potential UI subscriptions)
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: internalCache[key],
        },
      }));
    } catch (error) {
      console.error('Error setting cache entry:', error);
    }
  },

  get: <T,>(key: string): T | null => {
    try {
      const entry = internalCache[key];
      if (!entry) return null;

      // Check if entry has expired
      if (isExpired(entry)) {
        // Remove expired entry from internal cache (non-reactive)
        delete internalCache[key];
        persistCache();
        return null;
      }

      return entry.value as T;
    } catch (error) {
      console.error('Error getting cache entry:', error);
      return null;
    }
  },

  has: (key: string): boolean => {
    try {
      const entry = internalCache[key];
      if (!entry) return false;

      // Check if entry has expired
      if (isExpired(entry)) {
        // Remove expired entry from internal cache (non-reactive)
        delete internalCache[key];
        persistCache();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking cache entry:', error);
      return false;
    }
  },

  clear: () => {
    try {
      // Clear internal cache
      const keys = Object.keys(internalCache);
      for (const key of keys) {
        delete internalCache[key];
      }

      // Clear localStorage
      safeLocalStorage.removeItem('admin-cache-storage');

      // Update Zustand state atomically
      set({ cache: {} });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  },
}));

// Periodic cleanup of expired entries (runs every hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanExpiredEntries();
  }, 60 * 60 * 1000); // 1 hour
}

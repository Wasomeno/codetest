export interface ExtensionSettings {
  theme: 'light' | 'dark' | 'auto';
  defaultProject?: string;
  notificationSettings: {
    desktop: boolean;
    sound: boolean;
    slack: boolean;
  };
}

/**
 * Storage service using localStorage
 * Provides async interface for consistency with the previous Chrome storage implementation
 */
export const storageService = {
  get: async (key: string): Promise<any> => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return undefined;
      return JSON.parse(item);
    } catch {
      return undefined;
    }
  },
  
  set: async (key: string, value: any): Promise<void> => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  remove: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }
};

/**
 * Mock storage adapter using localStorage and IndexedDB
 * Provides persistent storage for frontend-only mode
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * LocalStorage-based adapter for simple key-value storage
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;

  constructor(prefix = 'family-logistics') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = localStorage.getItem(this.getKey(key));
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(this.getKey(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    keys.forEach((key) => localStorage.removeItem(this.getKey(key)));
  }

  async keys(): Promise<string[]> {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${this.prefix}:`)) {
        allKeys.push(key.substring(this.prefix.length + 1));
      }
    }
    return allKeys;
  }
}

/**
 * In-memory storage for testing or fallback
 */
export class InMemoryAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.storage.get(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.storage.set(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

/**
 * Factory to get the appropriate storage adapter
 */
export function createStorageAdapter(): StorageAdapter {
  // Check if localStorage is available
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return new LocalStorageAdapter();
  } catch {
    // Fallback to in-memory storage
    return new InMemoryAdapter();
  }
}

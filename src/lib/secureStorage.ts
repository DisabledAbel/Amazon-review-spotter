// Secure session storage utility with validation and sanitization

interface StorageItem {
  data: unknown;
  timestamp: number;
  version: string;
}

class SecureStorage {
  private readonly PREFIX = 'review-sensei-';
  private readonly VERSION = '1.0';
  private readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  private generateKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  private validateData(data: unknown): boolean {
    // Basic validation - ensure data is serializable
    try {
      JSON.stringify(data);
      return true;
    } catch {
      return false;
    }
  }

  setItem(key: string, data: unknown): boolean {
    try {
      if (!this.validateData(data)) {
        console.warn('Invalid data provided to secure storage');
        return false;
      }

      const storageItem: StorageItem = {
        data,
        timestamp: Date.now(),
        version: this.VERSION
      };

      const secureKey = this.generateKey(key);
      sessionStorage.setItem(secureKey, JSON.stringify(storageItem));
      return true;
    } catch (error) {
      console.error('Failed to store data securely:', error);
      return false;
    }
  }

  getItem<T = unknown>(key: string): T | null {
    try {
      const secureKey = this.generateKey(key);
      const stored = sessionStorage.getItem(secureKey);
      
      if (!stored) return null;

      const parsed: StorageItem = JSON.parse(stored);
      
      // Check version compatibility
      if (parsed.version !== this.VERSION) {
        this.removeItem(key);
        return null;
      }

      // Check if data has expired
      if (Date.now() - parsed.timestamp > this.MAX_AGE) {
        this.removeItem(key);
        return null;
      }

      return parsed.data as T;
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      this.removeItem(key); // Clean up corrupted data
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      const secureKey = this.generateKey(key);
      sessionStorage.removeItem(secureKey);
    } catch (error) {
      console.error('Failed to remove data securely:', error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
    }
  }

  // Validate and sanitize product analysis data
  setProductAnalysis(analysis: unknown): boolean {
    if (!analysis || typeof analysis !== 'object') {
      return false;
    }

    const validatedAnalysis = this.sanitizeProductAnalysis(analysis as Record<string, unknown>);
    return this.setItem('current-product-analysis', validatedAnalysis);
  }

  private sanitizeProductAnalysis(analysis: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    // Sanitize common fields
    if (typeof analysis.title === 'string') {
      sanitized.title = analysis.title.substring(0, 200);
    }
    
    if (typeof analysis.score === 'number' && !isNaN(analysis.score)) {
      sanitized.score = Math.max(0, Math.min(100, analysis.score));
    }
    
    if (typeof analysis.verdict === 'string') {
      sanitized.verdict = analysis.verdict.substring(0, 100);
    }

    if (Array.isArray(analysis.redFlags)) {
      sanitized.redFlags = analysis.redFlags
        .filter(flag => typeof flag === 'string')
        .slice(0, 10)
        .map(flag => String(flag).substring(0, 100));
    }

    return sanitized;
  }
}

export const secureStorage = new SecureStorage();
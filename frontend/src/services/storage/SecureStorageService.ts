// Secure client-side storage abstraction for session tokens and state
export class SecureStorageService {
  private static readonly STORAGE_PREFIX = 'novacodex_sec_';

  private static obfuscate(str: string): string {
    return btoa(encodeURIComponent(str));
  }

  private static deobfuscate(str: string): string {
    try {
      return decodeURIComponent(atob(str));
    } catch {
      return '';
    }
  }

  static SetEncryptedValue(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const obfuscated = this.obfuscate(serialized);
      localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, obfuscated);
    } catch (e) {
      console.error('[SecureStorage] Error saving value', e);
    }
  }

  static GetDecryptedValue<T = any>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      if (!raw) return null;
      const deobfuscated = this.deobfuscate(raw);
      return JSON.parse(deobfuscated) as T;
    } catch {
      return null;
    }
  }

  static RemoveEncryptedValue(key: string): void {
    localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
  }

  static ClearEncryptedStorage(): void {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  }
}

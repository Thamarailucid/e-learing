import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a cryptographically strong, human-readable random temporary password.
   * Ensures at least 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.
   */
  static generateSecurePassword(length: number = 12): string {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I, O to avoid confusion
    const lowers = 'abcdefghijkmnopqrstuvwxyz'; // Exclude l
    const digits = '23456789'; // Exclude 0, 1
    const symbols = '!@#$%&*';
    const all = uppers + lowers + digits + symbols;

    // Pick 1 guaranteed character from each class
    const passwordChars: string[] = [
      uppers[crypto.randomInt(0, uppers.length)],
      lowers[crypto.randomInt(0, lowers.length)],
      digits[crypto.randomInt(0, digits.length)],
      symbols[crypto.randomInt(0, symbols.length)],
    ];

    // Fill the rest randomly
    for (let i = passwordChars.length; i < Math.max(length, 8); i++) {
      passwordChars.push(all[crypto.randomInt(0, all.length)]);
    }

    // Fisher-Yates shuffle
    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      const temp = passwordChars[i];
      passwordChars[i] = passwordChars[j];
      passwordChars[j] = temp;
    }

    return passwordChars.join('');
  }
}


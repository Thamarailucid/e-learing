"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordUtils = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
class PasswordUtils {
    static SALT_ROUNDS = 12;
    static async hashPassword(password) {
        return bcryptjs_1.default.hash(password, this.SALT_ROUNDS);
    }
    static async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    /**
     * Generates a cryptographically strong, human-readable random temporary password.
     * Ensures at least 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.
     */
    static generateSecurePassword(length = 12) {
        const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I, O to avoid confusion
        const lowers = 'abcdefghijkmnopqrstuvwxyz'; // Exclude l
        const digits = '23456789'; // Exclude 0, 1
        const symbols = '!@#$%&*';
        const all = uppers + lowers + digits + symbols;
        // Pick 1 guaranteed character from each class
        const passwordChars = [
            uppers[crypto_1.default.randomInt(0, uppers.length)],
            lowers[crypto_1.default.randomInt(0, lowers.length)],
            digits[crypto_1.default.randomInt(0, digits.length)],
            symbols[crypto_1.default.randomInt(0, symbols.length)],
        ];
        // Fill the rest randomly
        for (let i = passwordChars.length; i < Math.max(length, 8); i++) {
            passwordChars.push(all[crypto_1.default.randomInt(0, all.length)]);
        }
        // Fisher-Yates shuffle
        for (let i = passwordChars.length - 1; i > 0; i--) {
            const j = crypto_1.default.randomInt(0, i + 1);
            const temp = passwordChars[i];
            passwordChars[i] = passwordChars[j];
            passwordChars[j] = temp;
        }
        return passwordChars.join('');
    }
}
exports.PasswordUtils = PasswordUtils;

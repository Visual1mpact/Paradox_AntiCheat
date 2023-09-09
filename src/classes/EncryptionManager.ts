import CryptoJS from "../node_modules/crypto-es/lib/index.js";

export class EncryptionManager {
    /**
     * Hashes a given string with the specified salt value using SHA-3 (SHA3-256) encryption.
     *
     * @param {string} salt - Hashes information
     * @param {string} text - String to be hashed
     * @returns {string} The hashed string
     */
    public static hashWithSalt(salt: string, text: string): string | null {
        if (typeof salt !== "string") {
            return null;
        }
        const combinedString = salt + text;
        const hash = CryptoJS.SHA3(combinedString, { outputLength: 256 }).toString();
        return hash.substring(0, 50);
    }

    /**
     * Encrypts a string using AES encryption with the specified salt as the key.
     *
     * @param {string} str - The string to encrypt
     * @param {string} salt - The salt to use as the key for encryption
     * @returns {string} The encrypted string
     */
    public static encryptString(str: string, salt: string): string {
        const encrypted = CryptoJS.AES.encrypt(str, salt).toString();
        return "1337" + encrypted;
    }

    /**
     * Decrypts a string using AES encryption with the specified salt as the key.
     *
     * @param {string} str - The string to decrypt
     * @param {string} salt - The salt to use for decryption
     * @returns {string} The decrypted string
     */
    public static decryptString(str: string, salt: string): string {
        str = str.slice(4); // Remove the prefix added in the encryptString function
        const decryptedBytes = CryptoJS.AES.decrypt(str, salt);
        const plaintext = decryptedBytes.toString(CryptoJS.enc.Utf8);
        return plaintext;
    }
}

import CryptoES from "../node_modules/crypto-es/lib/index";

const desiredMaxEncodedLength = 50; // Desired maximum encoded length
const approxBytesPerCharBase64 = 1.33; // Approximate bytes per character in base64 encoding

// Calculate the maximum key length in bytes
const maxKeyLengthBytes = Math.floor(desiredMaxEncodedLength / approxBytesPerCharBase64);

// Generate a random key of the calculated length
const generateRandomKey = (length: number): string => {
    const randomBytes = CryptoES.lib.WordArray.random(length);
    return CryptoES.enc.Base64.stringify(randomBytes);
};

// Generate the key
export let secretKey = generateRandomKey(maxKeyLengthBytes);

// Clear the key
export function clearSecretKey(): void {
    secretKey = null;
}

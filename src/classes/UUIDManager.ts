export class UUIDManager {
    /**
     * Generates a random UUID (RFC4122 version 4 compliant).
     * @returns {string} The generated UUID.
     */
    public static generateRandomUUID(): string {
        const lut: string[] = [];
        for (let i = 0; i < 256; i++) {
            lut[i] = (i < 16 ? "0" : "") + i.toString(16);
        }

        const d0 = (Math.random() * 0x100000000) >>> 0;
        const d1 = (Math.random() * 0x100000000) >>> 0;
        const d2 = (Math.random() * 0x100000000) >>> 0;
        const d3 = (Math.random() * 0x100000000) >>> 0;

        return (
            lut[d0 & 0xff] +
            lut[(d0 >> 8) & 0xff] +
            lut[(d0 >> 16) & 0xff] +
            lut[(d0 >> 24) & 0xff] +
            "-" +
            lut[d1 & 0xff] +
            lut[(d1 >> 8) & 0xff] +
            "-" +
            lut[((d1 >> 16) & 0x0f) | 0x40] +
            lut[(d1 >> 24) & 0xff] +
            "-" +
            lut[(d2 & 0x3f) | 0x80] +
            lut[(d2 >> 8) & 0xff] +
            "-" +
            lut[(d2 >> 16) & 0xff] +
            lut[(d2 >> 24) & 0xff] +
            lut[d3 & 0xff] +
            lut[(d3 >> 8) & 0xff] +
            lut[(d3 >> 16) & 0xff] +
            lut[(d3 >> 24) & 0xff]
        );
    }

    /**
     * Validates whether a given string is a valid UUID.
     * @param {string} uuid - The string to validate as a UUID.
     * @returns {boolean} - Returns true if the string is a valid UUID, false otherwise.
     */
    public static isValidUUID(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
}

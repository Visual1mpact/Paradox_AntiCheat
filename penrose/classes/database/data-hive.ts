import { world } from "@minecraft/server";

const CHUNK_SIZE = 30000;

/**
 * A modular database class for managing key-value pairs using dynamic properties.
 * Optimized for Minecraft Bedrock Edition scripting with support for large values via chunking.
 */
export class OptimizedDatabase {
    public name: string;
    private pointerKey: string;
    private cachedPointers: string[] | null = null;
    private static instances: OptimizedDatabase[] = []; // Static array to store all instances

    /**
     * Constructs an instance of OptimizedDatabase.
     * @param name - The name of the database. Must be unique, non-empty, and follow specific constraints.
     * @throws Will throw an error if the name is empty, or contains invalid characters.
     *
     * @example
     * const db = new OptimizedDatabase('myDatabase');
     */
    constructor(name: string) {
        if (!name || name.length === 0) {
            throw new Error("[Paradox] Database name cannot be empty.");
        }
        if (name.includes('"') || name.includes("/")) {
            throw new Error('[Paradox] Database name cannot include the characters `"` or `/`.');
        }

        this.name = name;
        this.pointerKey = `${this.name}/pointers`;

        // Initialize the pointers array if it doesn't exist.
        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
        }

        // Add this instance to the static array when created
        OptimizedDatabase.instances.push(this);
    }

    // Static method to get all database instances
    public static getAllInstances(): OptimizedDatabase[] {
        return OptimizedDatabase.instances;
    }

    /**
     * Retrieves the list of pointers stored in the database (cached).
     * @returns An array of strings representing the dynamic keys in the database.
     */
    private _getPointers(): string[] {
        if (this.cachedPointers !== null) return this.cachedPointers;
        const pointers = world.getDynamicProperty(this.pointerKey) as string | null;
        this.cachedPointers = pointers ? JSON.parse(pointers) : [];
        return this.cachedPointers;
    }

    /**
     * Updates the list of pointers in the database.
     * @param pointers - An array of strings representing the dynamic keys to store.
     */
    private _setPointers(pointers: string[]): void {
        this.cachedPointers = pointers;
        world.setDynamicProperty(this.pointerKey, JSON.stringify(pointers));
    }

    /**
     * Stores a key-value pair in the database. Automatically chunks the value if it exceeds the safe limit.
     * @param key - The key to store the value under. Must be unique within the database.
     * @param value - The value to associate with the key. Must be serializable to JSON.
     *
     * @example
     * db.set('key1', { name: 'item', value: 100 });
     */
    public set(key: string, value: any): void {
        const json = JSON.stringify(value);
        const dynamicKeyBase = `${this.name}/${key}`;
        const pointers = this._getPointers();

        // Remove old chunks
        this._deleteChunks(dynamicKeyBase);

        // Chunk and store
        const chunks = [];
        for (let i = 0; i < json.length; i += CHUNK_SIZE) {
            const chunk = json.slice(i, i + CHUNK_SIZE);
            const chunkKey = `${dynamicKeyBase}/${i / CHUNK_SIZE}`;
            world.setDynamicProperty(chunkKey, chunk);
            chunks.push(chunkKey);
        }

        if (!pointers.includes(dynamicKeyBase)) {
            pointers.push(dynamicKeyBase);
            this._setPointers(pointers);
        }
    }

    /**
     * Retrieves a value associated with a given key. Automatically reassembles chunked data.
     * @param key - The key to retrieve the value for.
     * @returns The value associated with the key, or `undefined` if the key does not exist.
     *
     * @example
     * const value = db.get('key1');
     * console.log(value); // { name: 'item', value: 100 }
     */
    public get<T = any>(key: string): T | undefined {
        const dynamicKeyBase = `${this.name}/${key}`;
        const chunks: string[] = [];

        for (let i = 0; ; i++) {
            const chunk = world.getDynamicProperty(`${dynamicKeyBase}/${i}`) as string | null;
            if (chunk === null || chunk === undefined) break;
            chunks.push(chunk);
        }

        if (chunks.length === 0) return undefined;

        const data = chunks.join("");
        return JSON.parse(data) as T;
    }

    /**
     * Deletes a key-value pair and all its chunks from the database.
     * @param key - The key to delete from the database.
     *
     * @example
     * db.delete('key1');
     */
    public delete(key: string): void {
        const dynamicKeyBase = `${this.name}/${key}`;
        const pointers = this._getPointers();

        if (pointers.includes(dynamicKeyBase)) {
            this._deleteChunks(dynamicKeyBase);
            this._setPointers(pointers.filter((p) => p !== dynamicKeyBase));
        }
    }

    /**
     * Clears all key-value pairs from the database, including chunked data.
     *
     * @example
     * db.clear(); // Clears all entries in the database
     */
    public clear(): void {
        const pointers = this._getPointers();
        pointers.forEach((ptr) => this._deleteChunks(ptr));
        this._setPointers([]);
    }

    /**
     * Retrieves all entries (key-value pairs) in the database.
     * @returns An array of tuples where each tuple contains a key and its associated value.
     *
     * @example
     * const entries = db.entries();
     * console.log(entries); // [['key1', { name: 'item', value: 100 }], ['key2', { name: 'another item', value: 50 }]]
     */
    public entries(): [string, any][] {
        return this._getPointers().map((ptr) => {
            const key = ptr.split("/").pop()!;
            const value = this.get(key);
            return [key, value];
        });
    }

    /**
     * Cleans invalid or empty entries from the database.
     *
     * By default, it removes entries where the value is:
     * - `undefined` or `null`
     * - an empty string `""`
     * - an empty array `[]`
     * - an empty object `{}`
     * - `NaN`
     * - a `function` or `symbol`
     *
     * You can also pass a custom validator function to define your own cleanup rules.
     *
     * @param validator - (Optional) A custom validation function `(key, value) => boolean`.
     *                    Return `true` to keep the entry, or `false` to delete it.
     *
     * @example
     * // Use default cleanup behavior:
     * db.clean();
     *
     * @example
     * // Use a custom validator to only keep entries where the value is a number > 10:
     * db.clean((key, value) => typeof value === 'number' && value > 10);
     *
     * @example
     * // Custom validator that removes entries where the key starts with "temp_":
     * db.clean((key, value) => !key.startsWith("temp_"));
     */
    public clean(validator?: (key: string, value: any) => boolean): void {
        const entries = this.entries();
        let deletedCount = 0;

        const defaultValidator = (value: any): boolean => {
            if (value === undefined || value === null) return false;
            if (typeof value === "string" && value.trim() === "") return false;
            if (Array.isArray(value) && value.length === 0) return false;
            if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
            if (typeof value === "number" && isNaN(value)) return false;
            if (typeof value === "function" || typeof value === "symbol") return false;
            return true;
        };

        for (const [key, value] of entries) {
            const isValid = validator ? validator(key, value) : defaultValidator(value);
            if (!isValid) {
                this.delete(key);
                console.warn(`[${this.name}] Deleted invalid entry "${key}" with value:`, value);
                deletedCount++;
            }
        }

        console.log(`[${this.name}] Cleanup complete. Total deleted entries: ${deletedCount}`);
    }

    /**
     * Internal helper to delete all chunks of a given base key.
     * @param baseKey - The base dynamic key (without chunk index).
     */
    private _deleteChunks(baseKey: string): void {
        for (let i = 0; ; i++) {
            const chunkKey = `${baseKey}/${i}`;
            const existing = world.getDynamicProperty(chunkKey);
            if (existing === undefined || existing === null) break;
            world.setDynamicProperty(chunkKey, null);
        }
    }

    /**
     * Retrieves the size in bytes for a specific entry.
     * If the entry is chunked, it sums the size of all chunks.
     * Each character in the chunk is counted as 2 bytes (UTF-16 encoding).
     *
     * @param key - The key representing the entry for which the size is to be calculated.
     * @returns The total size of the entry in bytes.
     */
    public getEntrySizeBytes(key: string): number {
        const dynamicKeyBase = `${this.name}/${key}`;
        let bytes = 0;

        // Iterate over all chunks for the entry
        for (let i = 0; ; i++) {
            const chunk = world.getDynamicProperty(`${dynamicKeyBase}/${i}`) as string;

            // If no more chunks are found, exit the loop
            if (chunk === null || chunk === undefined) break;

            // Accumulate the size of each chunk (UTF-16 encoding)
            bytes += chunk.length * 2;
        }

        return bytes;
    }

    /**
     * Calculates the total size of all entries stored in the database.
     * This includes the sizes of all chunks for each entry.
     * The total size is returned in a human-readable format.
     *
     * @returns A formatted string representing the total size of the database entries.
     */
    public getTotalSizeFormatted(): string {
        // Reduce all pointers to calculate the total size in bytes
        const totalBytes = this._getPointers().reduce((sum, ptr) => {
            const key = ptr.split("/").pop()!;
            return sum + this.getEntrySizeBytes(key);
        }, 0);

        // Return the formatted total size
        return this._formatBytes(totalBytes);
    }

    /**
     * Converts a number of bytes to a human-readable string.
     *
     * @param bytes - The size in bytes.
     * @returns A string representing the size in appropriate units (B, KB, MB, GB, TB).
     */
    public _formatBytes(bytes: number): string {
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes <= 0) return "0 B";
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Counts the number of chunks for a given key.
     * @param key - The key to count chunks for.
     * @returns The number of chunks.
     */
    public getChunkCount(key: string): number {
        const dynamicKeyBase = `${this.name}/${key}`;
        let chunkCount = 0;

        while (world.getDynamicProperty(`${dynamicKeyBase}/${chunkCount}`)) {
            chunkCount++;
        }

        return chunkCount;
    }

    /**
     * Lists all pointer keys currently stored in the database.
     * @returns An array of strings representing all pointers in the database.
     */
    public listPointers(): string[] {
        return this._getPointers();
    }

    /**
     * Verifies whether the database contains a specific entry key.
     * @param key - The key to check for in the database.
     * @returns `true` if the key exists, otherwise `false`.
     */
    public containsKey(key: string): boolean {
        return this._getPointers().includes(`${this.name}/${key}`);
    }
}

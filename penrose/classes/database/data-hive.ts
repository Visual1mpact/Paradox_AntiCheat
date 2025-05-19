import { system, world } from "@minecraft/server";

const CHUNK_SIZE = 30000;

/**
 * A modular and efficient database class for managing key-value pairs
 * using dynamic properties in Minecraft Bedrock Edition scripting.
 *
 * Supports large values via chunking and provides useful methods for
 * setting, retrieving, cleaning, and iterating over entries.
 */
export class OptimizedDatabase {
    public name: string;
    private pointerKey: string;
    private cachedPointers: string[] | null = null;
    private static instances: OptimizedDatabase[] = [];
    private static _locks = new Set<string>();

    /**
     * Creates a new instance of the OptimizedDatabase.
     *
     * @param name - A unique, non-empty name for the database. Must not contain `"` or `/`.
     * @throws Will throw an error if the name is empty or contains invalid characters.
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

        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
        }

        OptimizedDatabase.instances.push(this);
    }

    /**
     * Returns all existing instances of OptimizedDatabase.
     *
     * @returns An array of all created database instances.
     */
    public static getAllInstances(): OptimizedDatabase[] {
        return OptimizedDatabase.instances;
    }

    /**
     * Retrieves the internal pointer list used to track dynamic keys.
     *
     * @returns An array of dynamic property keys managed by this database.
     * @internal
     */
    private _getPointers(): string[] {
        if (this.cachedPointers !== null) return this.cachedPointers;
        const pointers = world.getDynamicProperty(this.pointerKey) as string | null;
        this.cachedPointers = pointers ? JSON.parse(pointers) : [];
        return this.cachedPointers;
    }

    /**
     * Updates the internal pointer list with the provided array.
     *
     * @param pointers - An array of dynamic keys to persist.
     * @internal
     */
    private _setPointers(pointers: string[]): void {
        this.cachedPointers = pointers;
        world.setDynamicProperty(this.pointerKey, JSON.stringify(pointers));
    }

    /**
     * Schedules a function to run on the next tick.
     *
     * @returns A promise that resolves on the next tick.
     * @internal
     */
    private static nextTick(): Promise<void> {
        return new Promise<void>((resolve) => {
            system.run(resolve);
        });
    }

    /**
     * Ensures exclusive access to a resource using an internal lock.
     *
     * @param resource - The resource name to lock.
     * @param fn - The async or sync function to execute with the lock.
     * @returns The result of the executed function.
     * @internal
     */
    private static async _withLock<T>(resource: string, fn: () => T | Promise<T>): Promise<T> {
        while (this._locks.has(resource)) await this.nextTick();
        this._locks.add(resource);
        try {
            return await fn();
        } finally {
            this._locks.delete(resource);
        }
    }

    /**
     * Stores a value in the database. Large values are automatically chunked.
     *
     * @param key - A unique key within the database.
     * @param value - Any JSON-serializable value to store.
     *
     * @example
     * await db.set("playerStats", { kills: 5, deaths: 2 });
     */
    public async set(key: string, value: any): Promise<void> {
        const base = `${this.name}/${key}`;
        await OptimizedDatabase._withLock(base, async () => {
            const json = JSON.stringify(value);
            const tmpBase = `${base}~tmp`;

            this._deleteChunks(tmpBase);

            for (let i = 0; i < json.length; i += CHUNK_SIZE) {
                world.setDynamicProperty(`${tmpBase}/${i / CHUNK_SIZE}`, json.slice(i, i + CHUNK_SIZE));
            }

            world.setDynamicProperty(base, "USE_TMP");

            this._deleteChunks(base);

            for (let i = 0; ; ++i) {
                const c = world.getDynamicProperty(`${tmpBase}/${i}`);
                if (c === undefined || c === null) break;
                world.setDynamicProperty(`${base}/${i}`, c);
                world.setDynamicProperty(`${tmpBase}/${i}`, null);
            }

            system.run(() => {
                world.setDynamicProperty(base, null);
                world.setDynamicProperty(tmpBase, null);
            });
        });

        const pointers = this._getPointers();
        if (!pointers.includes(base)) this._setPointers([...pointers, base]);
    }

    /**
     * Retrieves a value from the database by key.
     *
     * @param key - The key to retrieve.
     * @returns The parsed value, or `undefined` if not found.
     *
     * @example
     * const data = db.get("playerStats");
     * console.log(data?.kills); // 5
     */
    public get<T = any>(key: string): T | undefined {
        const base = `${this.name}/${key}`;
        const marker = world.getDynamicProperty(base) as string | null;
        const real = marker === "USE_TMP" ? `${base}~tmp` : base;

        let chunks: string[] = [];
        for (let i = 0; ; ++i) {
            const c = world.getDynamicProperty(`${real}/${i}`) as string | null;
            if (c === null || c === undefined) break;
            chunks.push(c);
        }

        return chunks.length ? (JSON.parse(chunks.join("")) as T) : undefined;
    }

    /**
     * Deletes a key-value pair from the database.
     *
     * @param key - The key to delete.
     *
     * @example
     * await db.delete("playerStats");
     */
    public async delete(key: string): Promise<void> {
        const base = `${this.name}/${key}`;
        await OptimizedDatabase._withLock(base, async () => {
            this._deleteChunks(base);
            this._setPointers(this._getPointers().filter((p) => p !== base));
        });
    }

    /**
     * Clears all data from the database, removing all keys and chunks.
     *
     * @example
     * db.clear();
     */
    public clear(): void {
        const pointers = this._getPointers();
        pointers.forEach((ptr) => this._deleteChunks(ptr));
        this._setPointers([]);
    }

    /**
     * Returns all entries in the database as an array of key-value pairs.
     *
     * @returns An array of tuples: `[key, value]`.
     *
     * @example
     * const data = db.entries();
     * data.forEach(([key, value]) => console.log(key, value));
     */
    public entries(): [string, any][] {
        return this._getPointers().map((ptr) => {
            const key = ptr.split("/").pop()!;
            const value = this.get(key);
            return [key, value];
        });
    }

    /**
     * Removes invalid or unwanted entries from the database.
     *
     * By default, deletes entries where the value is:
     * - `undefined`, `null`, `NaN`
     * - an empty string, array, or object
     * - a function or symbol
     *
     * You can override this behavior by passing a custom validator function.
     *
     * @param validator - Optional function `(key, value) => boolean` to decide which entries to keep.
     *
     * @example
     * db.clean(); // uses default validator
     *
     * @example
     * db.clean((key, value) => typeof value === "number" && value > 0);
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
     * Internal method to delete all chunks associated with a base key.
     *
     * @param baseKey - The prefix key for the chunked data.
     * @internal
     */
    private _deleteChunks(baseKey: string): void {
        for (let i = 0; ; ++i) {
            const key = `${baseKey}/${i}`;
            const exists = world.getDynamicProperty(key);
            if (exists === undefined || exists === null) break;
            world.setDynamicProperty(key, null);
        }
        world.setDynamicProperty(baseKey, null);
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

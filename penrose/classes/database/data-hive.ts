import { system, world } from "@minecraft/server";

const CHUNK_SIZE = 30000;

/**
 * Defines a valid structure for database values.
 * All entries must be plain objects.
 */
export type DatabaseValueObject = Record<string, any>;

/**
 * A type-safe and efficient database class for storing object-based key-value pairs
 * using Minecraft Bedrock Edition dynamic properties.
 *
 * @typeParam T - A shape of allowed keys and their corresponding object values.
 *
 * @example
 * ```ts
 * type DBShape = {
 *   playerStats: { kills: number; deaths: number };
 *   playerPrefs: { theme: string };
 * };
 * const db = new OptimizedDatabase<DBShape>("main");
 * await db.set("playerStats", { kills: 5, deaths: 2 });
 * ```
 */
export class OptimizedDatabase<T extends Record<string, DatabaseValueObject>> {
    public name: string;
    private pointerKey: string;
    private cachedPointers: string[] | undefined = undefined;
    private static instances: OptimizedDatabase<any>[] = [];
    private static _locks = new Set<string>();

    /**
     * Initializes a new named database instance.
     * @param name - A unique, non-empty identifier for this database.
     *               Cannot contain `"` or `/`.
     * @throws Will throw if the name is invalid.
     */
    constructor(name: string) {
        if (!name || name.length === 0) throw new Error("[Paradox] Database name cannot be empty.");
        if (name.includes('"') || name.includes("/")) {
            throw new Error('[Paradox] Database name cannot include the characters `"` or `/`.');
        }
        this.name = name;
        this.pointerKey = `${this.name}/pointers`;
        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
        }
        if (!OptimizedDatabase.instances.includes(this)) {
            OptimizedDatabase.instances.push(this);
        }
    }

    /**
     * Returns all existing instances of the database.
     */
    public static getAllInstances(): OptimizedDatabase<any>[] {
        return this.instances;
    }

    /**
     * Retrieves the internal pointer list used to track dynamic keys.
     *
     * @returns An array of dynamic property keys managed by this database.
     * @internal
     */
    private _getPointers(): string[] {
        if (this.cachedPointers !== undefined) return this.cachedPointers;
        const pointers = world.getDynamicProperty(this.pointerKey) as string | undefined;
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
        if (JSON.stringify(pointers) !== JSON.stringify(this.cachedPointers)) {
            this.cachedPointers = pointers;
            world.setDynamicProperty(this.pointerKey, JSON.stringify(pointers));
            this._markDirty();
        }
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
     * Marks the internal pointer cache as dirty,
     * forcing a re-read from dynamic properties the next time it's accessed.
     *
     * This should be used when pointer state changes outside of `_setPointers`.
     */
    private _markDirty(): void {
        this.cachedPointers = undefined;
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
        const TIMEOUT = 10000;
        const start = Date.now();
        while (this._locks.has(resource)) {
            if (Date.now() - start > TIMEOUT) throw new Error(`Lock timeout for resource: ${resource}`);
            await this.nextTick();
        }
        this._locks.add(resource);
        try {
            return await fn();
        } finally {
            this._locks.delete(resource);
        }
    }

    /**
     * Sets a key-value pair in the database.
     * Automatically chunks large values.
     *
     * @param key - A key defined in the schema `T`.
     * @param value - The value to store (must be an object).
     *
     * @example
     * await db.set("session", { id: 123 });
     */
    public async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        await OptimizedDatabase._withLock(base, async () => {
            const json = JSON.stringify(value);
            const tmpBase = `${base}~tmp`;

            // Write to temporary chunk space
            this._deleteChunks(tmpBase);

            const tmpChunks: Record<string, string> = {};
            for (let i = 0; i < json.length; i += CHUNK_SIZE) {
                tmpChunks[`${tmpBase}/${i / CHUNK_SIZE}`] = json.slice(i, i + CHUNK_SIZE);
            }

            world.setDynamicProperties(tmpChunks);
            world.setDynamicProperty(base, "USE_TMP");

            this._deleteChunks(base);

            // Finalize swap
            const realChunks: Record<string, string> = {};
            const deleteChunks: string[] = [];

            for (let i = 0; ; ++i) {
                const c = world.getDynamicProperty(`${tmpBase}/${i}`);
                if (c === undefined) break;
                realChunks[`${base}/${i}`] = c as string;
                deleteChunks.push(`${tmpBase}/${i}`);
            }

            world.setDynamicProperties(realChunks);
            this._deleteKeys([...deleteChunks, base, tmpBase]);
        });

        const pointers = this._getPointers();
        if (!pointers.includes(base)) this._setPointers([...pointers, base]);
    }
    /**
     * Gets a stored object by its key.
     *
     * @param key - The key to retrieve.
     * @returns The stored object or `undefined` if not found.
     *
     * @example
     * const data = db.get("session");
     */
    public get<K extends keyof T>(key: K): T[K] | undefined {
        const base = `${this.name}/${String(key)}`;
        const marker = world.getDynamicProperty(base) as string | undefined;
        const real = marker === "USE_TMP" ? `${base}~tmp` : base;

        let chunks: string[] = [];
        for (let i = 0; ; ++i) {
            const c = world.getDynamicProperty(`${real}/${i}`) as string | undefined;
            if (c === undefined) break;
            chunks.push(c);
        }

        if (!chunks.length) return undefined;

        try {
            return JSON.parse(chunks.join("")) as T[K];
        } catch (err) {
            console.warn(`[${this.name}] Failed to parse entry for key "${String(key)}":`, err);
            return undefined;
        }
    }

    /**
     * Deletes a key and its value from the database.
     *
     * @param key - The key to delete.
     *
     * @example
     * await db.delete("session");
     */
    public async delete<K extends keyof T>(key: K): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        await OptimizedDatabase._withLock(base, async () => {
            this._deleteChunks(base);
            this._setPointers(this._getPointers().filter((p) => p !== base));
        });
    }

    /**
     * Clears all data from the database, removing all keys and chunks.
     *
     * @example
     * await db.clear();
     */
    public async clear(): Promise<void> {
        await OptimizedDatabase._withLock(this.name, async () => {
            const pointers = this._getPointers();
            pointers.forEach((ptr) => this._deleteChunks(ptr));
            this._setPointers([]);
        });
    }

    /**
     * Returns all stored key-value pairs.
     *
     * @returns Array of [key, value] tuples.
     */
    public entries(): [keyof T, T[keyof T]][] {
        return this._getPointers()
            .map((ptr) => {
                const key = ptr.split("/").pop() as keyof T;
                const value = this.get(key);
                if (value === undefined) return null;
                return [key, value] as [keyof T, T[keyof T]];
            })
            .filter((entry): entry is [keyof T, T[keyof T]] => entry !== null);
    }

    /**
     * Removes entries with invalid or unwanted data.
     *
     * @param validator - Optional function to filter valid entries.
     *
     * @example
     * await db.clean((key, val) => typeof val === "object");
     */
    public async clean(validator?: (key: keyof T, value: T[keyof T]) => boolean): Promise<void> {
        await OptimizedDatabase._withLock(this.name, async () => {
            const entries = this.entries();
            let deletedCount = 0;

            const defaultValidator = (value: any): boolean => {
                if (value === undefined) return false;
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
                    await this.delete(key);
                    console.warn(`[${this.name}] Deleted invalid entry "${String(key)}" with value:`, value);
                    deletedCount++;
                }
            }

            console.log(`[${this.name}] Cleanup complete. Total deleted entries: ${deletedCount}`);
        });
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
            if (world.getDynamicProperty(key) === undefined) break;
            world.setDynamicProperty(key, undefined);
        }
        world.setDynamicProperty(baseKey, undefined);
    }

    /**
     * Deletes multiple dynamic properties by key, one by one.
     *
     * > This avoids using `world.setDynamicProperties()` since setting values to `undefined` in batch mode is not supported.
     * > Instead, each key is deleted individually using `world.setDynamicProperty(key, undefined)`.
     *
     * @private
     * @param {string[]} keys - The list of dynamic property keys to delete.
     */
    private _deleteKeys(keys: string[]): void {
        for (const key of keys) {
            try {
                world.setDynamicProperty(key, undefined);
            } catch (err) {
                console.warn(`[${this.name}] Failed to delete dynamic property key "${key}":`, err);
            }
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
        for (let i = 0; ; i++) {
            const chunk = world.getDynamicProperty(`${dynamicKeyBase}/${i}`) as string;
            if (chunk === undefined) break;
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
        const totalBytes = this._getPointers().reduce((sum, ptr) => {
            const key = ptr.split("/").pop()!;
            return sum + this.getEntrySizeBytes(key);
        }, 0);
        return this.formatBytes(totalBytes);
    }

    /**
     * Converts a number of bytes to a human-readable string.
     *
     * @param bytes - The size in bytes.
     * @returns A string representing the size in appropriate units (B, KB, MB, GB, TB).
     */
    public formatBytes(bytes: number): string {
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
     *
     * @example
     * if (db.containsKey("playerData")) {...}
     */
    public containsKey(key: string): boolean {
        return this._getPointers().includes(`${this.name}/${key}`);
    }
}

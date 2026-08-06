import { system, world } from "@minecraft/server";

/** Maximum string length stored per individual Bedrock dynamic property chunk */
const CHUNK_SIZE = 30000;

/** Defines a valid structure for database values. All entries must be plain objects */
export type DatabaseValueObject = Record<string, any>;

/**
 * UTF-16 Safe LZW Compressor optimized for JS/Minecraft Dynamic Properties.
 * Translates repetitive strings/JSON patterns into compact arrays and avoids
 * unpaired surrogate code points (0xD800-0xDFFF) that corrupt Bedrock NBT storage.
 */
class LZCompressor {
    /**
     * Compresses an uncompressed UTF-8/UTF-16 string using the LZW algorithm.
     * @param uncompressed Raw input string (e.g., stringified JSON).
     * @returns LZW compressed payload stringified safely as JSON array.
     */
    public static compress(uncompressed: string): string {
        if (!uncompressed) return "";

        let dictSize = 256;
        const dictionary = new Map<string, number>();
        for (let i = 0; i < 256; i++) {
            dictionary.set(String.fromCharCode(i), i);
        }

        let w = "";
        const result: number[] = [];

        for (let i = 0; i < uncompressed.length; i++) {
            const c = uncompressed.charAt(i);
            const wc = w + c;
            if (dictionary.has(wc)) {
                w = wc;
            } else {
                result.push(dictionary.get(w)!);
                dictionary.set(wc, dictSize++);
                w = c;
            }
        }

        if (w !== "") {
            result.push(dictionary.get(w)!);
        }

        // Return numerical code array as JSON string to stay within safe character bounds
        return JSON.stringify(result);
    }

    /**
     * Decompresses an LZW-compressed string back to its original raw form.
     * @param compressed LZW packed input stringified array.
     * @returns Decompressed raw text/JSON.
     */
    public static decompress(compressed: string): string {
        if (!compressed) return "";

        let compressedCodes: number[];
        try {
            compressedCodes = JSON.parse(compressed);
        } catch {
            return "";
        }

        if (!Array.isArray(compressedCodes) || compressedCodes.length === 0) return "";

        let dictSize = 256;
        const dictionary = new Map<number, string>();
        for (let i = 0; i < 256; i++) {
            dictionary.set(i, String.fromCharCode(i));
        }

        let w = String.fromCharCode(compressedCodes[0]);
        let result = w;

        for (let i = 1; i < compressedCodes.length; i++) {
            const k = compressedCodes[i];
            let entry = "";

            if (dictionary.has(k)) {
                entry = dictionary.get(k)!;
            } else if (k === dictSize) {
                entry = w + w.charAt(0);
            } else {
                throw new Error("[Paradox] Data Hive Error: Invalid LZW decompression block.");
            }

            result += entry;
            dictionary.set(dictSize++, w + entry.charAt(0));
            w = entry;
        }

        return result;
    }
}

/**
 * Type-safe, chunked database using Minecraft Dynamic Properties.
 * Features auto-chunking for payloads exceeding key size limits, concurrency locking,
 * LZW string compression, and automatic backward-compatibility for v1.0 entries.
 */
export class OptimizedDatabase<T extends Record<string, DatabaseValueObject>> {
    /** Unique database namespace identifier */
    public name: string;

    /** Global Dynamic Property key pointing to array of tracked entry base keys */
    private pointerKey: string;

    /** In-memory cache for pointers to minimize costly world property reads */
    private cachedPointers: string[] | undefined = undefined;

    /** Global registry of instantiated database instances for bulk operations/migration */
    private static instances: OptimizedDatabase<any>[] = [];

    /** Concurrency lock tracking set to prevent race conditions during async operations */
    private static _locks = new Set<string>();

    constructor(name: string) {
        if (!name || name.length === 0) throw new Error("[Paradox] Database name cannot be empty.");
        if (name.includes('"') || name.includes("/")) throw new Error('[Paradox] Database name cannot include `"` or `/`.');

        this.name = name;
        this.pointerKey = `${this.name}/pointers`;

        // Trapped world dynamic property read prevents startup crash during script load
        try {
            if (world.getDynamicProperty(`${this.pointerKey}/0`) === undefined && world.getDynamicProperty(this.pointerKey) === undefined) {
                world.setDynamicProperties({ [`${this.pointerKey}/0`]: JSON.stringify([]) });
            }
        } catch {
            // Ignored: world dynamic properties become accessible upon world load
        }

        // Maintain global registry list
        if (!OptimizedDatabase.instances.includes(this)) OptimizedDatabase.instances.push(this);
    }

    /**
     * Returns all active `OptimizedDatabase` instances instantiated in the current session.
     */
    public static getAllInstances(): OptimizedDatabase<any>[] {
        return this.instances;
    }

    /**
     * Reads pointer array listing stored entry base keys (uses cache when available).
     * Supports chunked pointer entries to prevent 32KB dynamic property string limit overflow.
     */
    private _getPointers(): string[] {
        if (this.cachedPointers !== undefined) return this.cachedPointers;

        const chunks: string[] = [];
        for (let i = 0; ; ++i) {
            const ptrChunk = world.getDynamicProperty(`${this.pointerKey}/${i}`) as string | undefined;
            if (ptrChunk === undefined) break;
            chunks.push(ptrChunk);
        }

        if (chunks.length === 0) {
            // Legacy single-key fallback check for v1 pointer structures
            try {
                const legacy = world.getDynamicProperty(this.pointerKey) as string | undefined;
                this.cachedPointers = legacy ? JSON.parse(legacy) : [];
                return this.cachedPointers!;
            } catch {
                this.cachedPointers = [];
                return [];
            }
        }

        try {
            const joined = chunks.join("");
            this.cachedPointers = joined.trim() ? JSON.parse(joined) : [];
        } catch {
            this.cachedPointers = [];
        }

        return this.cachedPointers || [];
    }

    /**
     * Persists updated pointer array into Dynamic Properties and updates internal cache.
     * Uses chunking to bypass single-key string size limits.
     */
    private _setPointers(pointers: string[]): void {
        if (JSON.stringify(pointers) !== JSON.stringify(this.cachedPointers)) {
            this.cachedPointers = pointers;
            const json = JSON.stringify(pointers);

            try {
                // Remove older pointer chunk keys
                for (let i = 0; ; ++i) {
                    const key = `${this.pointerKey}/${i}`;
                    if (world.getDynamicProperty(key) === undefined) break;
                    world.setDynamicProperty(key, undefined);
                }

                // Write chunked pointer index
                const chunks: Record<string, string> = {};
                for (let i = 0; i < json.length; i += CHUNK_SIZE) {
                    chunks[`${this.pointerKey}/${i / CHUNK_SIZE}`] = json.slice(i, i + CHUNK_SIZE);
                }
                world.setDynamicProperties(chunks);
            } catch (err) {
                console.warn(`[${this.name}] Failed to update database pointer index:`, err);
            }

            this._markDirty();
        }
    }

    /**
     * Invalidates internal cache, forcing next read operation to query raw world data.
     */
    private _markDirty(): void {
        this.cachedPointers = undefined;
    }

    /**
     * Executes an asynchronous operation behind a named lock to avoid write-collision race conditions.
     */
    private static async _withLock<T>(resource: string, fn: () => T | Promise<T>): Promise<T> {
        const TIMEOUT = 10000; // 10-second timeout safety net
        const start = Date.now();

        // Spin-wait until resource lock is released
        while (this._locks.has(resource)) {
            if (Date.now() - start > TIMEOUT) throw new Error(`Lock timeout for resource: ${resource}`);
            await new Promise<void>((resolve) => system.run(resolve));
        }

        this._locks.add(resource);
        try {
            return await fn();
        } finally {
            this._locks.delete(resource);
        }
    }

    /**
     * Clears all sub-chunks corresponding to a given base property key.
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
     * Safely deletes a list of raw dynamic property keys from the world.
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
     * Stores a key-value entry using transaction atomic staging and v2.0 LZW Compression.
     * @param key Entry key identifier.
     * @param value Structured object payload.
     */
    public async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        await OptimizedDatabase._withLock(base, async () => {
            const json = JSON.stringify(value);

            // Calculate expected chunk count for header tracking
            const rawCompressed = LZCompressor.compress(json);
            const chunkCount = Math.ceil((rawCompressed.length + 1) / CHUNK_SIZE);

            // Prefix payload with STX marker (\u0002) and header metadata specifying total chunk count
            const compressedPayload = `\u0002:${chunkCount}:` + rawCompressed;

            // Step 1: Write chunk payloads into temporary staging key space (~tmp) to guarantee crash safety
            const tmpBase = `${base}~tmp`;
            this._deleteChunks(tmpBase);

            const tmpChunks: Record<string, string> = {};
            for (let i = 0; i < compressedPayload.length; i += CHUNK_SIZE) {
                tmpChunks[`${tmpBase}/${i / CHUNK_SIZE}`] = compressedPayload.slice(i, i + CHUNK_SIZE);
            }

            world.setDynamicProperties(tmpChunks);
            world.setDynamicProperty(base, "USE_TMP"); // Mark base key as pointing to staging area

            // Step 2: Clean existing base key chunks
            this._deleteChunks(base);

            // Step 3: Promote staged ~tmp chunks into primary base key chunks
            const realChunks: Record<string, string> = {};
            const deleteChunks: string[] = [];

            for (let i = 0; ; ++i) {
                const c = world.getDynamicProperty(`${tmpBase}/${i}`);
                if (c === undefined) break;
                realChunks[`${base}/${i}`] = c as string;
                deleteChunks.push(`${tmpBase}/${i}`);
            }

            world.setDynamicProperties(realChunks);

            // Step 4: Cleanup temporary staging keys
            this._deleteKeys([...deleteChunks, base, tmpBase]);
        });

        // Register key base path in master pointer index
        const pointers = this._getPointers();
        if (!pointers.includes(base)) this._setPointers([...pointers, base]);
    }

    /**
     * Retrieves and parses a stored entry behind an async lock to prevent dirty reads.
     * Validates full chunk sequence completeness using header metadata.
     * @param key Entry key identifier.
     * @returns Parsed object payload or undefined if entry doesn't exist or is incomplete.
     */
    public async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
        const base = `${this.name}/${String(key)}`;
        return await OptimizedDatabase._withLock(base, async () => {
            const marker = world.getDynamicProperty(base) as string | undefined;

            // Read from staging (~tmp) if last transaction crashed during commit
            const real = marker === "USE_TMP" ? `${base}~tmp` : base;

            // Reassemble payload chunks in sequential order
            const chunks: string[] = [];
            for (let i = 0; ; ++i) {
                const c = world.getDynamicProperty(`${real}/${i}`) as string | undefined;
                if (c === undefined) break;
                chunks.push(c);
            }

            if (!chunks.length) return undefined;

            const rawData = chunks.join("").trim();

            if (!rawData) return undefined;

            try {
                // Version 2.0 Check: Inspect payload header marker (\u0002)
                if (rawData.startsWith("\u0002")) {
                    const headerEnd = rawData.indexOf(":", 2);
                    if (headerEnd !== -1) {
                        const expectedChunks = parseInt(rawData.slice(2, headerEnd), 10);
                        // Header integrity check: Verify payload contains all expected sub-chunks
                        if (!isNaN(expectedChunks) && chunks.length < expectedChunks) {
                            console.warn(`[${this.name}] Corrupted/incomplete entry read for key "${String(key)}": expected ${expectedChunks} chunks, found ${chunks.length}`);
                            return undefined;
                        }
                        const decompressed = LZCompressor.decompress(rawData.slice(headerEnd + 1));
                        return decompressed.trim() ? (JSON.parse(decompressed) as T[K]) : undefined;
                    }
                }

                // Version 1.0 Fallback: Handle legacy raw stringified JSON entries directly
                return JSON.parse(rawData) as T[K];
            } catch (err) {
                console.warn(`[${this.name}] Failed to parse entry for key "${String(key)}":`, err);
                return undefined;
            }
        });
    }

    /**
     * Scans through database entries, converting legacy v1.0 uncompressed entries to compressed v2.0 format.
     * @returns Summary statistics on processed entries and byte-reduction metrics.
     */
    public async migrateToV2(): Promise<{ migrated: number; originalBytes: number; compressedBytes: number }> {
        let migratedCount = 0;
        let originalTotal = 0;
        let compressedTotal = 0;

        const pointers = this._getPointers();

        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;

            // Fetch raw chunk sequence without high-level auto parsing
            const chunks: string[] = [];
            for (let i = 0; ; ++i) {
                const c = world.getDynamicProperty(`${ptr}/${i}`) as string | undefined;
                if (c === undefined) break;
                chunks.push(c);
            }

            const rawData = chunks.join("");

            // If header character lacks '\u0002' marker, migrate v1 entry to v2
            if (!rawData.startsWith("\u0002") && rawData.length > 0) {
                const parsedValue = await this.get(key);
                if (parsedValue !== undefined) {
                    const beforeBytes = this.getEntrySizeBytes(String(key));

                    // Re-saving entry via set() automatically applies LZW compression & header prefix
                    await this.set(key, parsedValue);

                    const afterBytes = this.getEntrySizeBytes(String(key));

                    originalTotal += beforeBytes;
                    compressedTotal += afterBytes;
                    migratedCount++;
                }
            }
        }

        console.log(`[${this.name}] Migration complete! Migrated ${migratedCount} entries.`);
        console.log(`[${this.name}] Saved Space: ${this.formatBytes(originalTotal - compressedTotal)} (${((1 - compressedTotal / (originalTotal || 1)) * 100).toFixed(1)}% reduction)`);

        return { migrated: migratedCount, originalBytes: originalTotal, compressedBytes: compressedTotal };
    }

    /**
     * Removes an entry from the database and updates pointers.
     */
    public async delete<K extends keyof T>(key: K): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        await OptimizedDatabase._withLock(base, async () => {
            this._deleteChunks(base);
            this._setPointers(this._getPointers().filter((p) => p !== base));
        });
    }

    /**
     * Completely wipes all keys, values, and pointer indices associated with this database.
     */
    public async clear(): Promise<void> {
        await OptimizedDatabase._withLock(this.name, async () => {
            const pointers = this._getPointers();
            pointers.forEach((ptr) => this._deleteChunks(ptr));
            this._setPointers([]);
        });
    }

    /**
     * Retrieves all valid [key, value] pairs stored in the database.
     */
    public async entries(): Promise<[keyof T, T[keyof T]][]> {
        const pointers = this._getPointers();
        const result: [keyof T, T[keyof T]][] = [];

        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;
            const value = await this.get(key);
            if (value !== undefined) {
                result.push([key, value]);
            }
        }

        return result;
    }

    /**
     * Evaluates stored entries against a validator function (or default validation) and removes invalid/empty values.
     * @param validator Optional callback returning false for entries that should be purged.
     * @param options Execution configuration (e.g. silent logging mode).
     */
    public async clean(validator?: (key: keyof T, value: T[keyof T]) => boolean, options?: { silent?: boolean }): Promise<void> {
        const silent = options?.silent ?? false;

        await OptimizedDatabase._withLock(this.name, async () => {
            const entriesList = await this.entries();
            let deletedCount = 0;

            // Fallback default validation checks for undefined, empty objects, arrays, empty strings, and NaN
            const defaultValidator = (value: any): boolean => {
                if (value === undefined) return false;
                if (typeof value === "string" && value.trim() === "") return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
                if (typeof value === "number" && isNaN(value)) return false;
                if (typeof value === "function" || typeof value === "symbol") return false;
                return true;
            };

            for (const [key, value] of entriesList) {
                const isValid = validator ? validator(key, value) : defaultValidator(value);
                if (!isValid) {
                    await this.delete(key);
                    if (!silent) {
                        console.warn(`[${this.name}] Deleted invalid entry "${String(key)}" with value:`, value);
                    }
                    deletedCount++;
                }
            }

            if (!silent) {
                console.log(`[${this.name}] Cleanup complete. Total deleted entries: ${deletedCount}`);
            }
        });
    }

    /** Returns array of raw full pointer key identifiers */
    public listPointers(): string[] {
        return this._getPointers();
    }

    /** Returns exact memory footprint size in bytes (UTF-16 chars * 2) for a given entry */
    public getEntrySizeBytes(key: string): number {
        const base = `${this.name}/${key}`;
        let bytes = 0;
        for (let i = 0; ; i++) {
            const chunk = world.getDynamicProperty(`${base}/${i}`) as string | undefined;
            if (chunk === undefined) break;
            bytes += chunk.length * 2; // UTF-16 standard character encoding uses 2 bytes per char
        }
        return bytes;
    }

    /** Formats numerical byte values into human-readable string units (e.g., KB, MB) */
    public formatBytes(bytes: number): string {
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes <= 0) return "0 B";
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(2)} ${sizes[i]}`;
    }

    /** Calculates and formats total footprint size across all key entries in the database instance */
    public getTotalSizeFormatted(): string {
        const totalBytes = this._getPointers().reduce((sum, ptr) => {
            const key = ptr.split("/").pop()!;
            return sum + this.getEntrySizeBytes(key);
        }, 0);
        return this.formatBytes(totalBytes);
    }

    /** Returns total number of dynamic property chunks used to store a specific key */
    public getChunkCount(key: string): number {
        const base = `${this.name}/${key}`;
        let count = 0;
        while (world.getDynamicProperty(`${base}/${count}`) !== undefined) count++;
        return count;
    }

    /** Checks whether a specific key exists in the database's index */
    public containsKey(key: string): boolean {
        return this._getPointers().includes(`${this.name}/${key}`);
    }
}

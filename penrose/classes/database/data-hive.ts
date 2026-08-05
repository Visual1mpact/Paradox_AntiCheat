import { system, world } from "@minecraft/server";

/** Maximum string length stored per individual Bedrock dynamic property chunk */
const CHUNK_SIZE = 30000;

/** Defines a valid structure for database values. All entries must be plain objects */
export type DatabaseValueObject = Record<string, any>;

/**
 * Lightweight LZW (Lempel-Ziv-Welch) Compressor optimized for JS/Minecraft UTF-16 Dynamic Properties.
 * Translates repetitive strings/JSON patterns into compact single UTF-16 character codes.
 */
class LZCompressor {
    /**
     * Compresses an uncompressed UTF-8/UTF-16 string using the LZW algorithm.
     * @param uncompressed Raw input string (e.g., stringified JSON).
     * @returns LZW compressed UTF-16 string prefixed for character packing.
     */
    public static compress(uncompressed: string): string {
        if (!uncompressed) return "";

        // Dictionary to track observed string phrases mapped to generated character codes
        const dict: Record<string, number> = {};
        const data = (uncompressed + "").split("");
        const out: number[] = [];

        let currChar: string;
        let phrase = data[0];
        let code = 256; // Standard ASCII range ends at 255; dictionary extensions begin at 256

        for (let i = 1; i < data.length; i++) {
            currChar = data[i];

            // If sequence is already in dictionary, extend current phrase search
            if (dict[phrase + currChar] != null) {
                phrase += currChar;
            } else {
                // Output code for known phrase (or raw ASCII char code if length is 1)
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));

                // Add new combined pattern phrase into dictionary
                dict[phrase + currChar] = code;
                code++;
                phrase = currChar;
            }
        }

        // Push remaining phrase
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));

        // Pack array of character codes back into a UTF-16 string block
        return String.fromCharCode(...out);
    }

    /**
     * Decompresses an LZW-compressed UTF-16 string back to its original raw form.
     * @param compressed LZW packed UTF-16 input string.
     * @returns Decompressed raw text/JSON.
     */
    public static decompress(compressed: string): string {
        if (!compressed) return "";

        // Reverse dictionary mapping codes back to string sequences
        const dict: Record<number, string> = {};
        const data = compressed.split("");

        let currChar = data[0];
        let oldPhrase = currChar;
        const out = [currChar];
        let code = 256;
        let phrase: string;

        for (let i = 1; i < data.length; i++) {
            const currCode = data[i].charCodeAt(0);

            // Rebuild symbol or sequence from current code point
            if (currCode < 256) {
                phrase = data[i];
            } else {
                phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
            }

            out.push(phrase);
            currChar = phrase.charAt(0);

            // Reconstruct original state entry in memory dictionary
            dict[code] = oldPhrase + currChar;
            code++;
            oldPhrase = phrase;
        }

        return out.join("");
    }
}

/**
 * Type-safe, chunked database using Minecraft Dynamic Properties.
 * Features auto-chunking for payloads exceeding key size limits, concurency locking,
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

        // Initialize empty pointer registry array in dynamic properties if non-existent
        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
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
     */
    private _getPointers(): string[] {
        if (this.cachedPointers !== undefined) return this.cachedPointers;
        const pointers = world.getDynamicProperty(this.pointerKey) as string | undefined;
        this.cachedPointers = pointers ? JSON.parse(pointers) : [];
        return this.cachedPointers || [];
    }

    /**
     * Persists updated pointer array into Dynamic Properties and updates internal cache.
     */
    private _setPointers(pointers: string[]): void {
        if (JSON.stringify(pointers) !== JSON.stringify(this.cachedPointers)) {
            this.cachedPointers = pointers;
            world.setDynamicProperty(this.pointerKey, JSON.stringify(pointers));
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

            // Prefix payload with ASCII STX control char (\u0002) to signify v2.0 compressed structure
            const compressedPayload = "\u0002" + LZCompressor.compress(json);

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
     * Retrieves and parses a stored entry, supporting both v1.0 raw JSON and v2.0 compressed entries.
     * @param key Entry key identifier.
     * @returns Parsed object payload or undefined if entry doesn't exist.
     */
    public get<K extends keyof T>(key: K): T[K] | undefined {
        const base = `${this.name}/${String(key)}`;
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

        const rawData = chunks.join("");

        try {
            // Version 2.0 Check: Inspect payload header marker (\u0002)
            if (rawData.startsWith("\u0002")) {
                const decompressed = LZCompressor.decompress(rawData.slice(1));
                return JSON.parse(decompressed) as T[K];
            }

            // Version 1.0 Fallback: Handle legacy raw stringified JSON entries directly
            return JSON.parse(rawData) as T[K];
        } catch (err) {
            console.warn(`[${this.name}] Failed to parse entry for key "${String(key)}":`, err);
            return undefined;
        }
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
                const parsedValue = this.get(key);
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
     * Evaluates stored entries against a validator function (or default validation) and removes invalid/empty values.
     * @param validator Optional callback returning false for entries that should be purged.
     * @param options Execution configuration (e.g. silent logging mode).
     */
    public async clean(validator?: (key: keyof T, value: T[keyof T]) => boolean, options?: { silent?: boolean }): Promise<void> {
        const silent = options?.silent ?? false;

        await OptimizedDatabase._withLock(this.name, async () => {
            const entries = this.entries();
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

            for (const [key, value] of entries) {
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

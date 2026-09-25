import { system, world } from "@minecraft/server";

/** Maximum string length stored per individual Bedrock dynamic property chunk */
const CHUNK_SIZE = 30000;

/** Iteration yield threshold to prevent Watchdog execution timeouts during LZW compression */
const COMPRESSION_YIELD_THRESHOLD = 5000;

/** Defines a valid structure for database values. All entries must be plain objects */
export type DatabaseValueObject = Record<string, any>;

/**
 * UTF-16 Safe LZW Compressor optimized for JS/Minecraft Dynamic Properties.
 * Translates repetitive strings/JSON patterns into compact arrays and avoids
 * unpaired surrogate code points (0xD800-0xDFFF) that corrupt Bedrock NBT storage.
 */
class LZCompressor {
    /**
     * Asynchronously compresses an uncompressed UTF-8/UTF-16 string using the LZW algorithm.
     * Yields execution to the server main loop periodically to avoid thread starvation and Watchdog hangs.
     * @param uncompressed Raw input string (e.g., stringified JSON).
     * @returns LZW compressed payload stringified safely as JSON array.
     */
    public static async compress(uncompressed: string): Promise<string> {
        if (!uncompressed) return "";

        let dictSize = 256;
        const dictionary = LZCompressor.buildInitialCompressDictionary();

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

            if (i > 0 && i % COMPRESSION_YIELD_THRESHOLD === 0) {
                await LZCompressor.yieldToEngine();
            }
        }

        if (w !== "") {
            result.push(dictionary.get(w)!);
        }

        return JSON.stringify(result);
    }

    /**
     * Decompresses an LZW-compressed string back to its original raw form.
     * @param compressed LZW packed input stringified array.
     * @returns Decompressed raw text/JSON.
     */
    public static decompress(compressed: string): string {
        if (!compressed) return "";

        const compressedCodes = LZCompressor.parseCodes(compressed);
        if (!compressedCodes || compressedCodes.length === 0) return "";

        const dictionary = LZCompressor.buildInitialDecompressDictionary();
        let dictSize = 256;

        let w = String.fromCharCode(compressedCodes[0]!);
        let result = w;

        for (let i = 1; i < compressedCodes.length; i++) {
            const k = compressedCodes[i];
            if (k === undefined) return "";

            const entry = LZCompressor.resolveEntry(k, dictSize, w, dictionary);
            if (!entry) return "";

            result += entry;
            dictionary.set(dictSize++, w + entry.charAt(0));
            w = entry;
        }

        return result;
    }

    /** Yields thread execution back to Bedrock engine to clear execution timer */
    private static async yieldToEngine(): Promise<void> {
        return new Promise<void>((resolve) => system.run(resolve));
    }

    /** Builds initial 256-entry dictionary for string compression */
    private static buildInitialCompressDictionary(): Map<string, number> {
        const dictionary = new Map<string, number>();
        for (let i = 0; i < 256; i++) {
            dictionary.set(String.fromCharCode(i), i);
        }
        return dictionary;
    }

    /** Builds initial 256-entry dictionary for string decompression */
    private static buildInitialDecompressDictionary(): Map<number, string> {
        const dictionary = new Map<number, string>();
        for (let i = 0; i < 256; i++) {
            dictionary.set(i, String.fromCharCode(i));
        }
        return dictionary;
    }

    /** Safely parses compressed string into code array */
    private static parseCodes(compressed: string): number[] | undefined {
        try {
            const parsed = JSON.parse(compressed);
            return Array.isArray(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }

    /** Resolves single LZW dictionary entry step */
    private static resolveEntry(k: number, dictSize: number, w: string, dictionary: Map<number, string>): string | undefined {
        if (dictionary.has(k)) return dictionary.get(k)!;
        if (k === dictSize) return w + w.charAt(0);
        return undefined;
    }
}

/**
 * Type-safe, chunked database using Minecraft Dynamic Properties.
 * Features chunking for large payloads, re-entrant concurrency locking,
 * non-blocking UTF-16 safe compression, and automated schema cleanup.
 */
export class OptimizedDatabase<T extends Record<string, DatabaseValueObject>> {
    /** Unique database namespace identifier */
    public name: string;

    /** Global Dynamic Property key pointing to array of tracked entry base keys */
    private pointerKey: string;

    /** In-memory cache set for pointers to ensure O(1) checks and operations */
    private cachedPointers: Set<string> | undefined = undefined;

    /** Global registry of instantiated database instances */
    private static instances: OptimizedDatabase<any>[] = [];

    /** Concurrency lock tracking set mapping resource keys to active lock owners */
    private static _locks = new Map<string, string>();

    constructor(name: string) {
        if (!name || name.length === 0) throw new Error("[Paradox] Database name cannot be empty.");
        if (name.includes('"') || name.includes("/")) throw new Error('[Paradox] Database name cannot include `"` or `/`.');

        this.name = name;
        this.pointerKey = `${this.name}/pointers`;

        this.initializePointers();

        if (!OptimizedDatabase.instances.includes(this)) OptimizedDatabase.instances.push(this);
    }

    /** Initializes property pointers defensively during startup */
    private initializePointers(): void {
        try {
            if (world.getDynamicProperty(`${this.pointerKey}/0`) === undefined && world.getDynamicProperty(this.pointerKey) === undefined) {
                world.setDynamicProperties({ [`${this.pointerKey}/0`]: JSON.stringify([]) });
            }
        } catch {
            // World dynamic properties become accessible upon world load
        }
    }

    /** Returns all active `OptimizedDatabase` instances instantiated in current session */
    public static getAllInstances(): OptimizedDatabase<any>[] {
        return this.instances;
    }

    /** Reads pointer set listing stored entry base keys (O(1) cached access) */
    private _getPointers(): Set<string> {
        if (this.cachedPointers !== undefined) return this.cachedPointers;

        const chunks = this._readRawChunks(this.pointerKey);
        if (chunks.length === 0) return this._readLegacyPointers();

        try {
            const joined = chunks.join("");
            const parsed = joined.trim() ? JSON.parse(joined) : [];
            this.cachedPointers = new Set<string>(parsed);
        } catch {
            this.cachedPointers = new Set<string>();
        }

        return this.cachedPointers;
    }

    /** Reads legacy unchunked pointer indices */
    private _readLegacyPointers(): Set<string> {
        try {
            const legacy = world.getDynamicProperty(this.pointerKey) as string | undefined;
            const parsed = legacy ? JSON.parse(legacy) : [];
            this.cachedPointers = new Set<string>(parsed);
        } catch {
            this.cachedPointers = new Set<string>();
        }
        return this.cachedPointers;
    }

    /** Persists updated pointer Set into Dynamic Properties */
    private _savePointers(): void {
        if (!this.cachedPointers) return;

        const arrayForm = Array.from(this.cachedPointers);
        const json = JSON.stringify(arrayForm);

        try {
            this._deleteChunks(this.pointerKey);

            const chunks: Record<string, string> = {};
            for (let i = 0; i < json.length; i += CHUNK_SIZE) {
                chunks[`${this.pointerKey}/${i / CHUNK_SIZE}`] = json.slice(i, i + CHUNK_SIZE);
            }
            world.setDynamicProperties(chunks);
        } catch (err) {
            console.warn(`[${this.name}] Failed to update database pointer index:`, err);
        }
    }

    /**
     * Executes an asynchronous operation behind a re-entrant resource lock.
     * @param resources List of resource strings to lock.
     * @param lockId Context identifier used for re-entrancy validation.
     * @param fn Callback function to execute inside lock context.
     */
    private static async _withLock<T>(resources: string[], lockId: string, fn: () => T | Promise<T>): Promise<T> {
        const TIMEOUT = 10000;
        const start = Date.now();

        while (OptimizedDatabase.isResourceBlocked(resources, lockId)) {
            if (Date.now() - start > TIMEOUT) throw new Error(`Lock timeout for resources: ${resources.join(", ")}`);
            await new Promise<void>((resolve) => system.run(resolve));
        }

        const acquired = OptimizedDatabase.acquireLocks(resources, lockId);

        try {
            return await fn();
        } finally {
            OptimizedDatabase.releaseLocks(acquired);
        }
    }

    /** Checks if any requested resource is locked by another context */
    private static isResourceBlocked(resources: string[], lockId: string): boolean {
        return resources.some((res) => this._locks.has(res) && this._locks.get(res) !== lockId);
    }

    /** Acquires ownership of unlocked resources */
    private static acquireLocks(resources: string[], lockId: string): string[] {
        const acquired: string[] = [];
        resources.forEach((res) => {
            if (!this._locks.has(res)) {
                this._locks.set(res, lockId);
                acquired.push(res);
            }
        });
        return acquired;
    }

    /** Releases active locks held by current context */
    private static releaseLocks(acquired: string[]): void {
        acquired.forEach((res) => this._locks.delete(res));
    }

    /** Generates a unique execution context token for lock re-entrancy */
    private _createLockContext(): string {
        return `${this.name}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /** Clears sub-chunks corresponding to a base property key safely */
    private _deleteChunks(baseKey: string): void {
        let i = 0;
        let consecutiveUndefined = 0;

        while (consecutiveUndefined < 5) {
            const key = `${baseKey}/${i}`;
            if (world.getDynamicProperty(key) !== undefined) {
                world.setDynamicProperty(key, undefined);
                consecutiveUndefined = 0;
            } else {
                consecutiveUndefined++;
            }
            i++;
        }
        world.setDynamicProperty(baseKey, undefined);
    }

    /** Reads array of sequential dynamic property chunk values */
    private _readRawChunks(baseKey: string): string[] {
        const chunks: string[] = [];
        for (let i = 0; ; ++i) {
            const c = world.getDynamicProperty(`${baseKey}/${i}`) as string | undefined;
            if (c === undefined) break;
            chunks.push(c);
        }
        return chunks;
    }

    /**
     * Stores a key-value entry using transaction staging and dynamic chunk calculation.
     * @param key Entry key identifier.
     * @param value Structured object payload.
     * @param lockId Optional existing lock token context.
     */
    public async set<K extends keyof T>(key: K, value: T[K], lockId?: string): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        const lockKeys = [this.name, base];
        const ctx = lockId ?? this._createLockContext();

        await OptimizedDatabase._withLock(lockKeys, ctx, async () => {
            const json = JSON.stringify(value);
            const rawCompressed = await LZCompressor.compress(json);

            const payload = this._formatPayload(rawCompressed);
            const tmpBase = `${base}~tmp`;

            this._deleteChunks(tmpBase);
            this._writeStagedPayload(tmpBase, payload);

            world.setDynamicProperty(base, "USE_TMP");
            this._deleteChunks(base);

            this._promoteStagedPayload(base, tmpBase);
        });

        this._updatePointerIndex(base);
    }

    /** Updates in-memory and dynamic property pointer index */
    private _updatePointerIndex(base: string): void {
        const pointers = this._getPointers();
        if (!pointers.has(base)) {
            pointers.add(base);
            this._savePointers();
        }
    }

    /** Formats compressed payloads with accurate chunk header offsets */
    private _formatPayload(rawCompressed: string): string {
        const dummyHeader = "\u0002:0:";
        let chunkCount = Math.ceil((dummyHeader.length + rawCompressed.length) / CHUNK_SIZE);
        let payload = `\u0002:${chunkCount}:` + rawCompressed;

        if (payload.length > chunkCount * CHUNK_SIZE) {
            chunkCount = Math.ceil(payload.length / CHUNK_SIZE);
            payload = `\u0002:${chunkCount}:` + rawCompressed;
        }
        return payload;
    }

    /** Writes staged temporary payload chunks */
    private _writeStagedPayload(tmpBase: string, payload: string): void {
        const tmpChunks: Record<string, string> = {};
        for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
            tmpChunks[`${tmpBase}/${i / CHUNK_SIZE}`] = payload.slice(i, i + CHUNK_SIZE);
        }
        world.setDynamicProperties(tmpChunks);
    }

    /** Promotes temporary staging chunks into primary storage space */
    private _promoteStagedPayload(base: string, tmpBase: string): void {
        const realChunks: Record<string, string> = {};
        const deleteKeys: string[] = [];

        for (let i = 0; ; ++i) {
            const c = world.getDynamicProperty(`${tmpBase}/${i}`);
            if (c === undefined) break;
            realChunks[`${base}/${i}`] = c as string;
            deleteKeys.push(`${tmpBase}/${i}`);
        }

        world.setDynamicProperties(realChunks);
        this._cleanupKeys([...deleteKeys, base, tmpBase]);
    }

    /** Safely removes intermediate properties */
    private _cleanupKeys(keys: string[]): void {
        for (const key of keys) {
            try {
                world.setDynamicProperty(key, undefined);
            } catch {
                // Non-critical property cleanup fallback
            }
        }
    }

    /**
     * Retrieves and parses a stored entry behind an async lock.
     * @param key Entry key identifier.
     * @param lockId Optional existing lock token context.
     * @returns Parsed payload or undefined if missing/corrupted.
     */
    public async get<K extends keyof T>(key: K, lockId?: string): Promise<T[K] | undefined> {
        const base = `${this.name}/${String(key)}`;
        const lockKeys = [this.name, base];
        const ctx = lockId ?? this._createLockContext();

        return await OptimizedDatabase._withLock(lockKeys, ctx, async () => {
            const marker = world.getDynamicProperty(base) as string | undefined;
            const real = marker === "USE_TMP" ? `${base}~tmp` : base;

            const chunks = this._readRawChunks(real);
            if (!chunks.length) return undefined;

            const rawData = chunks.join("").trim();
            if (!rawData) return undefined;

            return this._parseEntryData(rawData, chunks.length, String(key));
        });
    }

    /** Parses raw entry strings into value types */
    private _parseEntryData(rawData: string, chunkCount: number, keyStr: string): any {
        try {
            if (rawData.startsWith("\u0002")) {
                return this._parseCompressedHeader(rawData, chunkCount, keyStr);
            }
            return JSON.parse(rawData);
        } catch (err) {
            console.warn(`[${this.name}] Failed to parse entry for key "${keyStr}":`, err);
            return undefined;
        }
    }

    /** Parses compressed entry header and decompresses content */
    private _parseCompressedHeader(rawData: string, chunkCount: number, keyStr: string): any {
        const headerEnd = rawData.indexOf(":", 2);
        if (headerEnd === -1) return undefined;

        const expectedChunks = parseInt(rawData.slice(2, headerEnd), 10);
        if (!isNaN(expectedChunks) && chunkCount < expectedChunks) {
            console.warn(`[${this.name}] Corrupted entry for key "${keyStr}": expected ${expectedChunks} chunks, found ${chunkCount}`);
            return undefined;
        }

        const decompressed = LZCompressor.decompress(rawData.slice(headerEnd + 1));
        return decompressed.trim() ? JSON.parse(decompressed) : undefined;
    }

    /**
     * Converts legacy v1.0 uncompressed entries into compressed v2.0 structures.
     */
    public async migrateToV2(): Promise<{ migrated: number; originalBytes: number; compressedBytes: number }> {
        let migratedCount = 0;
        let originalTotal = 0;
        let compressedTotal = 0;

        const ctx = this._createLockContext();
        const pointers = this._getPointers();

        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;
            const chunks = this._readRawChunks(ptr);
            const rawData = chunks.join("");

            if (!rawData.startsWith("\u0002") && rawData.length > 0) {
                const parsedValue = await this.get(key, ctx);
                if (parsedValue !== undefined) {
                    const beforeBytes = this.getEntrySizeBytes(String(key));
                    await this.set(key, parsedValue, ctx);
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
     * Removes an entry from the database.
     * @param key Entry key identifier.
     * @param lockId Optional existing lock token context.
     */
    public async delete<K extends keyof T>(key: K, lockId?: string): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        const lockKeys = [this.name, base];
        const ctx = lockId ?? this._createLockContext();

        await OptimizedDatabase._withLock(lockKeys, ctx, async () => {
            this._deleteChunks(base);
            const pointers = this._getPointers();
            if (pointers.delete(base)) {
                this._savePointers();
            }
        });
    }

    /** Completely clears all keys, values, and index pointers associated with this database */
    public async clear(): Promise<void> {
        const ctx = this._createLockContext();

        await OptimizedDatabase._withLock([this.name], ctx, async () => {
            const pointers = this._getPointers();
            pointers.forEach((ptr) => this._deleteChunks(ptr));
            this.cachedPointers = new Set<string>();
            this._savePointers();
        });
    }

    /** Retrieves all valid [key, value] pairs */
    public async entries(lockId?: string): Promise<[keyof T, T[keyof T]][]> {
        const pointers = this._getPointers();
        const result: [keyof T, T[keyof T]][] = [];
        const ctx = lockId ?? this._createLockContext();

        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;
            const value = await this.get(key, ctx);
            if (value !== undefined) {
                result.push([key, value]);
            }
        }

        return result;
    }

    /** Default fallback validation rules for entry values */
    private isDefaultValid(value: any): boolean {
        if (value === undefined) return false;
        if (typeof value === "string" && value.trim() === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
        if (typeof value === "number" && isNaN(value)) return false;
        return typeof value !== "function" && typeof value !== "symbol";
    }

    /** Evaluates stored entries against a validator and purges invalid entries */
    public async clean(validator?: (key: keyof T, value: T[keyof T]) => boolean, options?: { silent?: boolean }): Promise<void> {
        const silent = options?.silent ?? false;
        const ctx = this._createLockContext();

        await OptimizedDatabase._withLock([this.name], ctx, async () => {
            const entriesList = await this.entries(ctx);
            let deletedCount = 0;

            for (const [key, value] of entriesList) {
                const isValid = validator ? validator(key, value) : this.isDefaultValid(value);
                if (!isValid) {
                    await this.delete(key, ctx);
                    if (!silent) console.warn(`[${this.name}] Deleted invalid entry "${String(key)}" with value:`, value);
                    deletedCount++;
                }
            }

            if (!silent) console.log(`[${this.name}] Cleanup complete. Total deleted entries: ${deletedCount}`);
        });
    }

    /** Returns array of raw full pointer key identifiers */
    public listPointers(): string[] {
        return Array.from(this._getPointers());
    }

    /** Returns exact memory footprint size in bytes (UTF-16 chars * 2) for a given entry */
    public getEntrySizeBytes(key: string): number {
        const base = `${this.name}/${key}`;
        let bytes = 0;
        for (let i = 0; ; i++) {
            const chunk = world.getDynamicProperty(`${base}/${i}`) as string | undefined;
            if (chunk === undefined) break;
            bytes += chunk.length * 2;
        }
        return bytes;
    }

    /** Formats numerical byte values into human-readable string units */
    public formatBytes(bytes: number): string {
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes <= 0) return "0 B";
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(2)} ${sizes[i]}`;
    }

    /** Calculates total footprint size across all key entries in the database instance */
    public getTotalSizeFormatted(): string {
        let totalBytes = 0;
        for (const ptr of this._getPointers()) {
            const key = ptr.split("/").pop()!;
            totalBytes += this.getEntrySizeBytes(key);
        }
        return this.formatBytes(totalBytes);
    }

    /** Returns total number of dynamic property chunks used to store a specific key */
    public getChunkCount(key: string): number {
        const base = `${this.name}/${key}`;
        let count = 0;
        while (world.getDynamicProperty(`${base}/${count}`) !== undefined) count++;
        return count;
    }

    /** Checks whether a specific key exists in the database's index in O(1) time */
    public containsKey(key: string): boolean {
        return this._getPointers().has(`${this.name}/${key}`);
    }
}

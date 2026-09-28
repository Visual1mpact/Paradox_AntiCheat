import { system, world } from "@minecraft/server";

/** Maximum character length stored per dynamic property chunk */
const CHUNK_SIZE = 30000;

/** Iteration yield threshold to prevent Watchdog timeouts during heavy tasks */
const COMPRESSION_YIELD_THRESHOLD = 15000;

/** Size of batch operations processed during parallelized cleanup sweeps */
const CLEANUP_BATCH_SIZE = 100;

/** Valid structure constraint for database entry values */
export type DatabaseValueObject = Record<string, any>;

/**
 * Ultra-fast bit-packed LZW Compressor for Minecraft Script API.
 * Optimized with standard JS Object key lookups for O(1) performance.
 */
class LZCompressor {
    /**
     * Compresses input string asynchronously yielding execution to prevent watchdog issues.
     *
     * @param uncompressed - Plain text JSON string payload to compress.
     * @returns Promise resolving to JSON string representation of compressed integer character codes.
     */
    public static async compress(uncompressed: string): Promise<string> {
        // Return empty payload immediately if source string is falsy or empty
        if (!uncompressed) return "";

        let dictSize = 256;
        // Plain object lookup outperforms Map in JS engines for string keys
        const dictionary: Record<string, number> = Object.create(null);

        // Initialize dictionary with single-byte ASCII entries (0-255)
        for (let i = 0; i < 256; i++) {
            dictionary[String.fromCharCode(i)] = i;
        }

        let w = "";
        const result: number[] = [];
        const len = uncompressed.length;

        // Iterate through each character in the source payload
        for (let i = 0; i < len; i++) {
            const c = uncompressed.charAt(i);
            const wc = w + c;

            // Check if word sequence already exists in compression dictionary
            if (dictionary[wc] !== undefined) {
                w = wc;
            } else {
                // Output dictionary index code for current word w
                result.push(dictionary[w]!);
                // Add new word sequence wc to dictionary
                dictionary[wc] = dictSize++;
                w = c;
            }

            // Yield execution thread to main engine tick to avoid script watchdog warnings
            if (i > 0 && i % COMPRESSION_YIELD_THRESHOLD === 0) {
                await LZCompressor.yieldToEngine();
            }
        }

        // Flush remaining character code buffer to output stream
        if (w !== "") {
            result.push(dictionary[w]!);
        }

        return JSON.stringify(result);
    }

    /**
     * Decompresses LZW array back to raw string.
     *
     * @param compressed - JSON string representation of compressed integer character code array.
     * @returns Original uncompressed plain text string payload.
     */
    public static decompress(compressed: string): string {
        // Return empty string immediately if source payload is falsy or empty
        if (!compressed) return "";

        // Parse JSON payload into raw integer code array
        const compressedCodes = LZCompressor.parseCodes(compressed);
        if (!compressedCodes || compressedCodes.length === 0) return "";

        // Pre-allocate array storage for standard ASCII lookup dictionary
        const dictionary: string[] = new Array(256);
        for (let i = 0; i < 256; i++) {
            dictionary[i] = String.fromCharCode(i);
        }

        let dictSize = 256;
        let w = String.fromCharCode(compressedCodes[0]!);
        let result = w;

        // Reconstruct raw string entries sequentially from compressed code lookup stream
        for (let i = 1; i < compressedCodes.length; i++) {
            const k = compressedCodes[i];
            if (k === undefined) return "";

            let entry: string;
            if (dictionary[k] !== undefined) {
                entry = dictionary[k];
            } else if (k === dictSize) {
                // Handle special LZ dictionary edge case code lookup matching current dictionary size
                entry = w + w.charAt(0);
            } else {
                // Invalid or corrupted compressed code lookup sequence
                return "";
            }

            result += entry;
            // Expand lookup dictionary with reconstructed sequence entry
            dictionary[dictSize++] = w + entry.charAt(0);
            w = entry;
        }

        return result;
    }

    /**
     * Asynchronously yields script engine execution context to prevent watchdog engine interruptions.
     *
     * @returns Promise resolving on the next server game tick loop execution.
     */
    private static async yieldToEngine(): Promise<void> {
        return new Promise<void>((resolve) => system.run(resolve));
    }

    /**
     * Safely parses JSON-encoded compressed code arrays.
     *
     * @param compressed - Serialized string payload representing integer codes array.
     * @returns Array of dictionary codes or undefined if JSON parsing fails.
     */
    private static parseCodes(compressed: string): number[] | undefined {
        try {
            const parsed = JSON.parse(compressed);
            return Array.isArray(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    }
}

/**
 * High-performance Dynamic Property database supporting fast memory caching,
 * non-blocking microtask lock queues, and O(1) bulk cleanups.
 */
export class OptimizedDatabase<T extends Record<string, DatabaseValueObject>> {
    /** Database unique identifier namespace prefix */
    public name: string;

    /** Internal dynamic property key string where index pointers are tracked */
    private pointerKey: string;

    /** In-memory cached Set of active key pointers for rapid O(1) membership lookups */
    private cachedPointers: Set<string> | undefined = undefined;

    /** Flag tracking whether an asynchronous index pointer flush task is pending */
    private indexSaveScheduled = false;

    /** Queue-based zero-wait lock registry mapping resource keys to waiting callback tasks */
    private static lockQueues = new Map<string, Array<() => void>>();

    /** Active concurrency lock owners mapping resource keys to unique execution context IDs */
    private static activeLocks = new Map<string, string>();

    /** Global array registry tracking all active initialized database instances */
    private static instances: OptimizedDatabase<any>[] = [];

    /**
     * Initializes dynamic property database instance and configures index pointer dynamic property keys.
     *
     * @param name - Database name identifier prefix. Must not contain quotes or slashes.
     */
    constructor(name: string) {
        // Enforce name formatting safety checks
        if (!name || name.length === 0) throw new Error("[Paradox] Database name cannot be empty.");
        if (name.includes('"') || name.includes("/")) throw new Error('[Paradox] Database name cannot include `"` or `/`.');

        this.name = name;
        this.pointerKey = `${this.name}/pointers`;
        this.initializePointers();

        // Register instance in global static registry if not present
        if (!OptimizedDatabase.instances.includes(this)) OptimizedDatabase.instances.push(this);
    }

    /**
     * Ensures root dynamic property index pointer chunk initialized during initial setup.
     */
    private initializePointers(): void {
        try {
            // Check if neither initial chunked index pointer nor legacy root pointer key exists
            if (world.getDynamicProperty(`${this.pointerKey}/0`) === undefined && world.getDynamicProperty(this.pointerKey) === undefined) {
                world.setDynamicProperty(`${this.pointerKey}/0`, JSON.stringify([]));
            }
        } catch {
            // Deferred load state handling when world dynamic properties are unreadable
        }
    }

    /**
     * Retrieves static instance array containing all active initialized databases.
     *
     * @returns Array of active OptimizedDatabase instances.
     */
    public static getAllInstances(): OptimizedDatabase<any>[] {
        return this.instances;
    }

    /**
     * Internal method to fetch index pointer key cache or load dynamic property keys from storage.
     *
     * @returns In-memory Set containing all active base record key pointers.
     */
    private _getPointers(): Set<string> {
        // Return cached pointer Set if already loaded into memory
        if (this.cachedPointers !== undefined) return this.cachedPointers;

        // Read physical string chunks belonging to index pointer array
        const chunks = this._readRawChunks(this.pointerKey);
        if (chunks.length === 0) return this._readLegacyPointers();

        try {
            // Reassemble chunks and parse JSON key pointer array
            const joined = chunks.join("");
            const parsed = joined.trim() ? JSON.parse(joined) : [];
            this.cachedPointers = new Set<string>(parsed);
        } catch {
            // Fall back to empty pointer set if stored structure is corrupted
            this.cachedPointers = new Set<string>();
        }

        return this.cachedPointers;
    }

    /**
     * Reads legacy single-property index structure for backward compatibility migrations.
     *
     * @returns In-memory Set of key pointers parsed from legacy root dynamic property.
     */
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

    /**
     * Schedules or immediately triggers pointer index flush to engine dynamic property storage.
     *
     * @param immediate - If true, flushes index pointer payload synchronously without tick deferral.
     */
    private _savePointers(immediate = false): void {
        if (!this.cachedPointers) return;

        // Perform synchronous save if immediate flag is requested
        if (immediate) {
            this._flushPointersToStorage();
            return;
        }

        // Avoid queuing redundant tick save tasks if one is already scheduled
        if (this.indexSaveScheduled) return;
        this.indexSaveScheduled = true;

        // Defer pointer storage flush task to next engine tick cycle
        system.run(() => {
            this.indexSaveScheduled = false;
            this._flushPointersToStorage();
        });
    }

    /**
     * Serializes in-memory pointer Set into chunked dynamic properties.
     */
    private _flushPointersToStorage(): void {
        if (!this.cachedPointers) return;

        const json = JSON.stringify(Array.from(this.cachedPointers));
        const updates: Record<string, string | undefined> = {};

        let chunkIdx = 0;
        // Divide index pointer payload string into fixed chunk sizes
        for (let i = 0; i < json.length; i += CHUNK_SIZE) {
            updates[`${this.pointerKey}/${chunkIdx}`] = json.slice(i, i + CHUNK_SIZE);
            chunkIdx++;
        }

        // Clean up orphaned index pointer chunks beyond current length bounds
        this._cleanupExcessChunksBatch(this.pointerKey, chunkIdx, updates);
        // Bulk apply dynamic property modifications to world storage
        world.setDynamicProperties(updates);
    }

    /**
     * Non-blocking queue-based lock acquisition for microsecond task scheduling.
     *
     * @template T Execution return payload type.
     * @param resources - Array of resource identifier lock strings required.
     * @param lockId - Unique lock context ID requesting resource access.
     * @param fn - Asynchronous workflow callback executed under acquired locks.
     * @returns Promise resolving to execution results from callback.
     */
    private static async _withLock<T>(resources: string[], lockId: string, fn: () => T | Promise<T>): Promise<T> {
        // Sequentially acquire locks for all specified resources
        for (const res of resources) {
            // Wait in lock queue if resource is currently held by another context
            while (this.activeLocks.has(res) && this.activeLocks.get(res) !== lockId) {
                await new Promise<void>((resolve) => {
                    let queue = this.lockQueues.get(res);
                    if (!queue) {
                        queue = [];
                        this.lockQueues.set(res, queue);
                    }
                    queue.push(resolve);
                });
            }
            // Assign active lock context ownership to resource
            this.activeLocks.set(res, lockId);
        }

        try {
            // Execute protected code operation
            return await fn();
        } finally {
            // Release lock ownership for acquired resources in reverse or standard order
            for (const res of resources) {
                if (this.activeLocks.get(res) === lockId) {
                    this.activeLocks.delete(res);
                    const queue = this.lockQueues.get(res);
                    // Wake next waiting transaction context in queue
                    if (queue && queue.length > 0) {
                        const next = queue.shift()!;
                        next();
                    }
                }
            }
        }
    }

    /**
     * Generates unique transaction context token used for lock queue scheduling.
     *
     * @returns Unique lock identifier string containing database name, timestamp, and random token.
     */
    private _createLockContext(): string {
        return `${this.name}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Deletes chunks in a single batch operation.
     *
     * @param baseKey - Target dynamic property key base string.
     * @param batchUpdates - Key-value update dictionary accumulating undefined values for deletion.
     */
    private _deleteChunksBatch(baseKey: string, batchUpdates: Record<string, string | undefined>): void {
        let i = 0;
        let consecutiveUndefined = 0;

        // Read forward through numeric chunk key suffix indices until consecutive empty records hit safety threshold
        while (consecutiveUndefined < 3) {
            const key = `${baseKey}/${i}`;
            if (world.getDynamicProperty(key) !== undefined) {
                batchUpdates[key] = undefined;
                consecutiveUndefined = 0;
            } else {
                consecutiveUndefined++;
            }
            i++;
        }
        // Delete parent base key if present
        batchUpdates[baseKey] = undefined;
    }

    /**
     * Traverses forward beyond current chunk index, marking leftover dynamic property chunks for deletion.
     *
     * @param baseKey - Dynamic property base key prefix.
     * @param startIndex - Starting chunk index integer to evaluate for excess stale properties.
     * @param batchUpdates - Key-value update dictionary accumulating undefined values for deletion.
     */
    private _cleanupExcessChunksBatch(baseKey: string, startIndex: number, batchUpdates: Record<string, string | undefined>): void {
        let i = startIndex;
        let consecutiveUndefined = 0;

        // Sweep forward beyond write limit to clear historical leftover chunks
        while (consecutiveUndefined < 3) {
            const key = `${baseKey}/${i}`;
            if (world.getDynamicProperty(key) !== undefined) {
                batchUpdates[key] = undefined;
                consecutiveUndefined = 0;
            } else {
                consecutiveUndefined++;
            }
            i++;
        }
    }

    /**
     * Reads all raw chunked dynamic property text fragments into an ordered string array.
     *
     * @param baseKey - Dynamic property base storage key prefix.
     * @returns Ordered array of raw chunk string payloads.
     */
    private _readRawChunks(baseKey: string): string[] {
        const chunks: string[] = [];
        // Incrementally fetch chunks starting from index 0 until undefined property returned
        for (let i = 0; ; ++i) {
            const c = world.getDynamicProperty(`${baseKey}/${i}`) as string | undefined;
            if (c === undefined) break;
            chunks.push(c);
        }
        return chunks;
    }

    /**
     * Stores value object under designated key, automatically applying LZW compression and multi-chunk splitting.
     *
     * @template K Key property name in schema map T.
     * @param key - Target entry identifier.
     * @param value - Value payload object matching schema model.
     * @param lockId - Optional lock transaction ID if executing under parent lock task scope.
     */
    public async set<K extends keyof T>(key: K, value: T[K], lockId?: string): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        const lockKeys = [this.name, base];
        const ctx = lockId ?? this._createLockContext();

        await OptimizedDatabase._withLock(lockKeys, ctx, async () => {
            const json = JSON.stringify(value);
            const rawCompressed = await LZCompressor.compress(json);

            // Determine if LZW compressed representation yields actual size reduction over raw string JSON
            const payloadToStore = rawCompressed.length < json.length ? this._formatPayload(rawCompressed) : json;
            const updateBatch: Record<string, string | undefined> = {};

            let chunkIdx = 0;
            // Split serialized payload string into chunk dynamic properties
            for (let i = 0; i < payloadToStore.length; i += CHUNK_SIZE) {
                updateBatch[`${base}/${chunkIdx}`] = payloadToStore.slice(i, i + CHUNK_SIZE);
                chunkIdx++;
            }

            // Remove excess trailing chunks left behind by previously larger stores
            this._cleanupExcessChunksBatch(base, chunkIdx, updateBatch);
            // Synchronize updates directly to Minecraft world dynamic property engine
            world.setDynamicProperties(updateBatch);
        });

        // Register key base path into index pointers
        this._updatePointerIndex(base);
    }

    /**
     * Registers entry key base path into index pointers cache.
     *
     * @param base - Full base property path identifier.
     */
    private _updatePointerIndex(base: string): void {
        const pointers = this._getPointers();
        if (!pointers.has(base)) {
            pointers.add(base);
            this._savePointers();
        }
    }

    /**
     * Prepends dynamic metadata header denoting expected chunk counts to compressed payload streams.
     *
     * @param rawCompressed - Compressed array string payload output from LZCompressor.
     * @returns Formatted metadata payload string.
     */
    private _formatPayload(rawCompressed: string): string {
        const dummyHeader = "\u0002:0:";
        let chunkCount = Math.ceil((dummyHeader.length + rawCompressed.length) / CHUNK_SIZE);
        let payload = `\u0002:${chunkCount}:` + rawCompressed;

        // Recalculate chunk boundary if header length expansion pushes payload across chunk edge
        if (payload.length > chunkCount * CHUNK_SIZE) {
            chunkCount = Math.ceil(payload.length / CHUNK_SIZE);
            payload = `\u0002:${chunkCount}:` + rawCompressed;
        }
        return payload;
    }

    /**
     * Fetches payload value stored under key, performing dynamic decompression and parsing.
     *
     * @template K Key property name in schema map T.
     * @param key - Database entry key name.
     * @param lockId - Optional existing transaction lock context token.
     * @returns Promise resolving to value object or undefined if entry key not found.
     */
    public async get<K extends keyof T>(key: K, lockId?: string): Promise<T[K] | undefined> {
        const base = `${this.name}/${String(key)}`;
        const lockKeys = [this.name, base];
        const ctx = lockId ?? this._createLockContext();

        return await OptimizedDatabase._withLock(lockKeys, ctx, async () => {
            // Read all dynamic property chunks corresponding to key base path
            const chunks = this._readRawChunks(base);
            if (!chunks.length) return undefined;

            const rawData = chunks.join("").trim();
            if (!rawData) return undefined;

            // Reconstruct, decompress, and parse entry value payload
            return this._parseEntryData(rawData, chunks.length, String(key));
        });
    }

    /**
     * Inspects raw dynamic property text to parse JSON or route compressed header payloads.
     *
     * @param rawData - Full joined raw text stream read across dynamic property chunks.
     * @param chunkCount - Number of dynamic property chunks retrieved.
     * @param keyStr - Human-readable string representation of entry key for logging.
     * @returns Parsed JSON object payload or undefined if string reading fails.
     */
    private _parseEntryData(rawData: string, chunkCount: number, keyStr: string): any {
        try {
            // Check for control character header prefix denoting compressed LZW data stream
            if (rawData.startsWith("\u0002")) {
                return this._parseCompressedHeader(rawData, chunkCount, keyStr);
            }
            // Parse plain JSON string payload directly
            return JSON.parse(rawData);
        } catch (err) {
            console.warn(`[${this.name}] Failed to parse entry for key "${keyStr}":`, err);
            return undefined;
        }
    }

    /**
     * Validates compressed chunk count metadata and decompresses inner payload.
     *
     * @param rawData - Raw payload string containing control character header.
     * @param chunkCount - Physical dynamic property chunk count retrieved from storage.
     * @param keyStr - Entry key string for error context logging.
     * @returns Parsed JSON payload object or undefined if integrity check fails.
     */
    private _parseCompressedHeader(rawData: string, chunkCount: number, keyStr: string): any {
        const headerEnd = rawData.indexOf(":", 2);
        if (headerEnd === -1) return undefined;

        // Extract expected dynamic property chunk count from metadata header
        const expectedChunks = parseInt(rawData.slice(2, headerEnd), 10);
        if (!isNaN(expectedChunks) && chunkCount < expectedChunks) {
            console.warn(`[${this.name}] Corrupted entry for key "${keyStr}": expected ${expectedChunks} chunks, found ${chunkCount}`);
            return undefined;
        }

        // Decompress raw compressed data section following header boundary
        const decompressed = LZCompressor.decompress(rawData.slice(headerEnd + 1));
        return decompressed.trim() ? JSON.parse(decompressed) : undefined;
    }

    /**
     * Scans database entries and upgrades uncompressed legacy structures to LZW compressed format.
     *
     * @returns Object detailing migrated key counts and total byte savings metrics.
     */
    public async migrateToV2(): Promise<{ migrated: number; originalBytes: number; compressedBytes: number }> {
        let migratedCount = 0;
        let originalTotal = 0;
        let compressedTotal = 0;

        const ctx = this._createLockContext();
        const pointers = this._getPointers();

        // Iterate through all active key pointers in database
        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;
            const chunks = this._readRawChunks(ptr);
            const rawData = chunks.join("");

            // Check if record is uncompressed legacy payload
            if (!rawData.startsWith("\u0002") && rawData.length > 0) {
                const parsedValue = await this.get(key, ctx);
                if (parsedValue !== undefined) {
                    const beforeBytes = this.getEntrySizeBytes(String(key));
                    // Overwrite key record, triggering automatic LZW format encoding evaluation
                    await this.set(key, parsedValue, ctx);
                    const afterBytes = this.getEntrySizeBytes(String(key));

                    originalTotal += beforeBytes;
                    compressedTotal += afterBytes;
                    migratedCount++;
                }
            }
        }

        return { migrated: migratedCount, originalBytes: originalTotal, compressedBytes: compressedTotal };
    }

    /**
     * Removes database entry completely from dynamic property storage and pointer index.
     *
     * @template K Key property name in schema map T.
     * @param key - Database entry key identifier to remove.
     * @param lockId - Optional existing transaction lock context token.
     */
    public async delete<K extends keyof T>(key: K, lockId?: string): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        const lockKeys = [this.name, base];
        const ctx = lockId ?? this._createLockContext();

        await OptimizedDatabase._withLock(lockKeys, ctx, async () => {
            const batchUpdates: Record<string, string | undefined> = {};
            // Flag all chunk properties belonging to key base for removal
            this._deleteChunksBatch(base, batchUpdates);
            world.setDynamicProperties(batchUpdates);

            // Remove pointer key entry from index cache and trigger storage save
            const pointers = this._getPointers();
            if (pointers.delete(base)) {
                this._savePointers();
            }
        });
    }

    /**
     * Purges all keys, stored values, and index pointers belonging to this database.
     */
    public async clear(): Promise<void> {
        const ctx = this._createLockContext();

        await OptimizedDatabase._withLock([this.name], ctx, async () => {
            const pointers = this._getPointers();
            const batchUpdates: Record<string, string | undefined> = {};

            // Mark all entry chunks for deletion across all known pointers
            pointers.forEach((ptr) => this._deleteChunksBatch(ptr, batchUpdates));
            world.setDynamicProperties(batchUpdates);

            // Reset local in-memory index pointer set and flush immediately
            this.cachedPointers = new Set<string>();
            this._savePointers(true);
        });
    }

    /**
     * Retrieves array of key-value tuples representing all stored database entries.
     *
     * @param lockId - Optional lock context identifier token.
     * @returns Promise resolving to key-value entry tuple array.
     */
    public async entries(lockId?: string): Promise<[keyof T, T[keyof T]][]> {
        const pointers = this._getPointers();
        const result: [keyof T, T[keyof T]][] = [];
        const ctx = lockId ?? this._createLockContext();

        // Retrieve and parse each entry sequentially
        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;
            const value = await this.get(key, ctx);
            if (value !== undefined) {
                result.push([key, value]);
            }
        }

        return result;
    }

    /**
     * Evaluates whether payload value meets general validity requirements when no custom validator is provided.
     *
     * @param value - Arbitrary payload value to evaluate for validity.
     * @returns True if value is non-empty and valid.
     */
    private isDefaultValid(value: any): boolean {
        if (value === undefined) return false;
        if (typeof value === "string" && value.trim() === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return false;
        if (typeof value === "number" && isNaN(value)) return false;
        return typeof value !== "function" && typeof value !== "symbol";
    }

    /**
     * Iterates stored records in parallelized batches, purging invalid entries or entries failing predicate validator.
     *
     * @param validator - Optional filter predicate function returning true for valid items to retain.
     * @param options - Configuration options, including silent output toggle.
     */
    public async clean(validator?: (key: keyof T, value: T[keyof T]) => boolean, options?: { silent?: boolean }): Promise<void> {
        const silent = options?.silent ?? false;
        const ctx = this._createLockContext();

        await OptimizedDatabase._withLock([this.name], ctx, async () => {
            const pointers = Array.from(this._getPointers());
            let deletedCount = 0;

            // Process pointers in discrete batch sizes to optimize tick performance
            for (let i = 0; i < pointers.length; i += CLEANUP_BATCH_SIZE) {
                const batch = pointers.slice(i, i + CLEANUP_BATCH_SIZE);
                const batchUpdates: Record<string, string | undefined> = {};

                // Evaluate batch items concurrently
                const evaluatedBatch = await Promise.all(
                    batch.map(async (ptr) => {
                        const key = ptr.split("/").pop() as keyof T;
                        const value = await this.get(key, ctx);
                        const isValid = validator ? validator(key, value as T[keyof T]) : this.isDefaultValid(value);
                        return { ptr, key, value, isValid };
                    })
                );

                // Collect deletion updates for items evaluated as invalid
                for (const item of evaluatedBatch) {
                    if (!item.isValid) {
                        this._deleteChunksBatch(item.ptr, batchUpdates);
                        this._getPointers().delete(item.ptr);
                        if (!silent) console.warn(`[${this.name}] Deleted invalid entry "${String(item.key)}" with value:`, item.value);
                        deletedCount++;
                    }
                }

                // Flush pending dynamic property updates for current batch
                if (Object.keys(batchUpdates).length > 0) {
                    world.setDynamicProperties(batchUpdates);
                }

                // Yield to tick loop every batch cycle to maintain smooth FPS under 18x load
                await new Promise<void>((resolve) => system.run(resolve));
            }

            // Save updated index pointer list if items were removed
            if (deletedCount > 0) {
                this._savePointers(true);
            }

            if (!silent) console.log(`[${this.name}] Cleanup complete. Total deleted entries: ${deletedCount}`);
        });
    }

    /**
     * Returns string array containing all registered base pointer key paths.
     *
     * @returns Array of key pointer string paths.
     */
    public listPointers(): string[] {
        return Array.from(this._getPointers());
    }

    /**
     * Calculates storage size of specific key entry in bytes (UTF-16 encoding calculation).
     *
     * @param key - Entry key name to evaluate.
     * @returns Integer count representing payload byte size.
     */
    public getEntrySizeBytes(key: string): number {
        const base = `${this.name}/${key}`;
        let bytes = 0;
        // Sum character counts across stored dynamic property chunk strings (2 bytes per UTF-16 char)
        for (let i = 0; ; i++) {
            const chunk = world.getDynamicProperty(`${base}/${i}`) as string | undefined;
            if (chunk === undefined) break;
            bytes += chunk.length * 2;
        }
        return bytes;
    }

    /**
     * Formats raw byte integer count into human-readable unit string (B, KB, MB, GB, TB).
     *
     * @param bytes - Numeric byte count to format.
     * @returns Formatted size string.
     */
    public formatBytes(bytes: number): string {
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes <= 0) return "0 B";
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(2)} ${sizes[i]}`;
    }

    /**
     * Calculates total footprint byte size across all database key entries and formats output string.
     *
     * @returns Human-readable total storage footprint size string.
     */
    public getTotalSizeFormatted(): string {
        let totalBytes = 0;
        for (const ptr of this._getPointers()) {
            const key = ptr.split("/").pop()!;
            totalBytes += this.getEntrySizeBytes(key);
        }
        return this.formatBytes(totalBytes);
    }

    /**
     * Retrieves count of physical dynamic property chunks used to store key payload.
     *
     * @param key - Entry key identifier.
     * @returns Integer count of physical property chunks allocated.
     */
    public getChunkCount(key: string): number {
        const base = `${this.name}/${key}`;
        let count = 0;
        while (world.getDynamicProperty(`${base}/${count}`) !== undefined) count++;
        return count;
    }

    /**
     * Checks whether key pointer is present in database index cache.
     *
     * @param key - Unprefixed key name to inspect.
     * @returns True if key exists in active pointer index Set.
     */
    public containsKey(key: string): boolean {
        return this._getPointers().has(`${this.name}/${key}`);
    }
}

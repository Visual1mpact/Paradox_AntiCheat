import { system, world } from "@minecraft/server";

const CHUNK_SIZE = 30000;

/** Defines a valid structure for database values. All entries must be plain objects */
export type DatabaseValueObject = Record<string, any>;

/**
 * Lightweight LZW Compressor optimized for JS/Minecraft UTF-16 Dynamic Properties
 */
class LZCompressor {
    public static compress(uncompressed: string): string {
        if (!uncompressed) return "";
        const dict: Record<string, number> = {};
        const data = (uncompressed + "").split("");
        const out: number[] = [];
        let currChar: string;
        let phrase = data[0];
        let code = 256;

        for (let i = 1; i < data.length; i++) {
            currChar = data[i];
            if (dict[phrase + currChar] != null) {
                phrase += currChar;
            } else {
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                dict[phrase + currChar] = code;
                code++;
                phrase = currChar;
            }
        }
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));

        // Pack numbers into UTF-16 string blocks
        return String.fromCharCode(...out);
    }

    public static decompress(compressed: string): string {
        if (!compressed) return "";
        const dict: Record<number, string> = {};
        const data = compressed.split("");
        let currChar = data[0];
        let oldPhrase = currChar;
        const out = [currChar];
        let code = 256;
        let phrase: string;

        for (let i = 1; i < data.length; i++) {
            const currCode = data[i].charCodeAt(0);
            if (currCode < 256) {
                phrase = data[i];
            } else {
                phrase = dict[currCode] ? dict[currCode] : oldPhrase + currChar;
            }
            out.push(phrase);
            currChar = phrase.charAt(0);
            dict[code] = oldPhrase + currChar;
            code++;
            oldPhrase = phrase;
        }
        return out.join("");
    }
}

/**
 * Type-safe, chunked database using dynamic properties, resilient to crashes.
 * Version 2.0 - Features LZW Compression and Backward Compatibility.
 */
export class OptimizedDatabase<T extends Record<string, DatabaseValueObject>> {
    public name: string;
    private pointerKey: string;
    private cachedPointers: string[] | undefined = undefined;
    private static instances: OptimizedDatabase<any>[] = [];
    private static _locks = new Set<string>();

    constructor(name: string) {
        if (!name || name.length === 0) throw new Error("[Paradox] Database name cannot be empty.");
        if (name.includes('"') || name.includes("/")) throw new Error('[Paradox] Database name cannot include `"` or `/`.');
        this.name = name;
        this.pointerKey = `${this.name}/pointers`;
        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
        }
        if (!OptimizedDatabase.instances.includes(this)) OptimizedDatabase.instances.push(this);
    }

    public static getAllInstances(): OptimizedDatabase<any>[] {
        return this.instances;
    }

    private _getPointers(): string[] {
        if (this.cachedPointers !== undefined) return this.cachedPointers;
        const pointers = world.getDynamicProperty(this.pointerKey) as string | undefined;
        this.cachedPointers = pointers ? JSON.parse(pointers) : [];
        return this.cachedPointers || [];
    }

    private _setPointers(pointers: string[]): void {
        if (JSON.stringify(pointers) !== JSON.stringify(this.cachedPointers)) {
            this.cachedPointers = pointers;
            world.setDynamicProperty(this.pointerKey, JSON.stringify(pointers));
            this._markDirty();
        }
    }

    private _markDirty(): void {
        this.cachedPointers = undefined;
    }

    private static async _withLock<T>(resource: string, fn: () => T | Promise<T>): Promise<T> {
        const TIMEOUT = 10000;
        const start = Date.now();
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

    private _deleteChunks(baseKey: string): void {
        for (let i = 0; ; ++i) {
            const key = `${baseKey}/${i}`;
            if (world.getDynamicProperty(key) === undefined) break;
            world.setDynamicProperty(key, undefined);
        }
        world.setDynamicProperty(baseKey, undefined);
    }

    private _deleteKeys(keys: string[]): void {
        for (const key of keys) {
            try {
                world.setDynamicProperty(key, undefined);
            } catch (err) {
                console.warn(`[${this.name}] Failed to delete dynamic property key "${key}":`, err);
            }
        }
    }

    /** Sets a key-value pair with v2.0 LZW Compression */
    public async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        await OptimizedDatabase._withLock(base, async () => {
            const json = JSON.stringify(value);

            // v2.0 Payload format: Prefix with "\u0002" (ASCII STX) to identify v2 compressed data
            const compressedPayload = "\u0002" + LZCompressor.compress(json);

            const tmpBase = `${base}~tmp`;
            this._deleteChunks(tmpBase);

            const tmpChunks: Record<string, string> = {};
            for (let i = 0; i < compressedPayload.length; i += CHUNK_SIZE) {
                tmpChunks[`${tmpBase}/${i / CHUNK_SIZE}`] = compressedPayload.slice(i, i + CHUNK_SIZE);
            }

            world.setDynamicProperties(tmpChunks);
            world.setDynamicProperty(base, "USE_TMP");

            this._deleteChunks(base);

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

    /** Retrieves a stored object (Handles both v1.0 raw and v2.0 compressed entries) */
    public get<K extends keyof T>(key: K): T[K] | undefined {
        const base = `${this.name}/${String(key)}`;
        const marker = world.getDynamicProperty(base) as string | undefined;
        const real = marker === "USE_TMP" ? `${base}~tmp` : base;

        const chunks: string[] = [];
        for (let i = 0; ; ++i) {
            const c = world.getDynamicProperty(`${real}/${i}`) as string | undefined;
            if (c === undefined) break;
            chunks.push(c);
        }

        if (!chunks.length) return undefined;

        const rawData = chunks.join("");

        try {
            // Version 2.0 Check: Is data prefixed with "\u0002"?
            if (rawData.startsWith("\u0002")) {
                const decompressed = LZCompressor.decompress(rawData.slice(1));
                return JSON.parse(decompressed) as T[K];
            }

            // Version 1.0 Fallback (Raw Uncompressed JSON)
            return JSON.parse(rawData) as T[K];
        } catch (err) {
            console.warn(`[${this.name}] Failed to parse entry for key "${String(key)}":`, err);
            return undefined;
        }
    }

    /** Converts all legacy v1.0 entries to compressed v2.0 format */
    public async migrateToV2(): Promise<{ migrated: number; originalBytes: number; compressedBytes: number }> {
        let migratedCount = 0;
        let originalTotal = 0;
        let compressedTotal = 0;

        const pointers = this._getPointers();

        for (const ptr of pointers) {
            const key = ptr.split("/").pop() as keyof T;

            // Read raw chunks directly without automatic parsing
            const chunks: string[] = [];
            for (let i = 0; ; ++i) {
                const c = world.getDynamicProperty(`${ptr}/${i}`) as string | undefined;
                if (c === undefined) break;
                chunks.push(c);
            }

            const rawData = chunks.join("");

            // If it doesn't have the v2 header, it's a v1 entry needing migration
            if (!rawData.startsWith("\u0002") && rawData.length > 0) {
                const parsedValue = this.get(key);
                if (parsedValue !== undefined) {
                    const beforeBytes = this.getEntrySizeBytes(String(key));

                    // Saving re-compresses using set()
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

    public async delete<K extends keyof T>(key: K): Promise<void> {
        const base = `${this.name}/${String(key)}`;
        await OptimizedDatabase._withLock(base, async () => {
            this._deleteChunks(base);
            this._setPointers(this._getPointers().filter((p) => p !== base));
        });
    }

    public async clear(): Promise<void> {
        await OptimizedDatabase._withLock(this.name, async () => {
            const pointers = this._getPointers();
            pointers.forEach((ptr) => this._deleteChunks(ptr));
            this._setPointers([]);
        });
    }

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

    public async clean(validator?: (key: keyof T, value: T[keyof T]) => boolean, options?: { silent?: boolean }): Promise<void> {
        const silent = options?.silent ?? false;

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

    public listPointers(): string[] {
        return this._getPointers();
    }

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

    public formatBytes(bytes: number): string {
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        if (bytes <= 0) return "0 B";
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
        const value = bytes / Math.pow(1024, i);
        return `${value.toFixed(2)} ${sizes[i]}`;
    }

    public getTotalSizeFormatted(): string {
        const totalBytes = this._getPointers().reduce((sum, ptr) => {
            const key = ptr.split("/").pop()!;
            return sum + this.getEntrySizeBytes(key);
        }, 0);
        return this.formatBytes(totalBytes);
    }

    public getChunkCount(key: string): number {
        const base = `${this.name}/${key}`;
        let count = 0;
        while (world.getDynamicProperty(`${base}/${count}`) !== undefined) count++;
        return count;
    }

    public containsKey(key: string): boolean {
        return this._getPointers().includes(`${this.name}/${key}`);
    }
}

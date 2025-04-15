import { world } from "@minecraft/server";

const CHUNK_SIZE = 30000;

/**
 * A modular database class for managing key-value pairs using dynamic properties.
 * Optimized for Minecraft Bedrock Edition scripting with support for large values via chunking.
 */
export class OptimizedDatabase {
    private name: string;
    private pointerKey: string;
    private cachedPointers: string[] | null = null;

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
            throw new Error("Database name cannot be empty.");
        }
        if (name.includes('"') || name.includes("/")) {
            throw new Error('Database name cannot include the characters `"` or `/`.');
        }

        this.name = name;
        this.pointerKey = `${this.name}/pointers`;

        // Initialize the pointers array if it doesn't exist.
        if (!world.getDynamicProperty(this.pointerKey)) {
            world.setDynamicProperty(this.pointerKey, JSON.stringify([]));
        }
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
}

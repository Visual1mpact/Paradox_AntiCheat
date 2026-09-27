import { world, Player, system } from "@minecraft/server";
import { flagsDB } from "../../event-listeners/world-initialize";
import { ViolationFlagEntry, PlayerFlagRecord } from "../../types/db-types";

const FLAG_STACK_WINDOW_MS = 10000;
const FLUSH_INTERVAL_TICKS = 100; // Persist dirty records every 5 seconds (20 ticks/sec)

// In-memory cache for O(1) synchronous hot-path updates
const flagCache = new Map<string, PlayerFlagRecord>();
const dirtyPlayers = new Set<string>();

let isFlushScheduled = false;

/**
 * Manages player violation flag lifecycle, in-memory O(1) caching, and persistent storage flushing.
 */
export class FlagManager {
    /**
     * Initializes the background flush loop and runs an initial database integrity check.
     */
    public static init(): void {
        if (isFlushScheduled) return;
        isFlushScheduled = true;

        // Defer database cleanup to allow server world load completion
        system.run(() => {
            void FlagManager.sanitizeDatabase();
        });

        // Schedule background batch persistence loop
        system.runInterval(() => {
            void FlagManager.flushToDatabase();
        }, FLUSH_INTERVAL_TICKS);
    }

    /**
     * Synchronously logs a violation flag into O(1) memory.
     * Prevents lock timeouts, thread starvation, and Watchdog server hangs.
     *
     * @param player - The player committing the violation.
     * @param flagType - The detection category (e.g., "Fly", "AutoClicker", "Killaura").
     * @param details - Contextual metrics or descriptions of the detection.
     */
    public static async logFlag(player: Player, flagType: string, details: string): Promise<void> {
        if (!player || !player.isValid) return;

        const playerId = player.id;
        const now = Date.now();
        const isoDate = new Date(now).toISOString();

        // 1. Fetch or initialize record in O(1) memory
        let record = flagCache.get(playerId);
        if (!record) {
            record = {
                playerName: player.name,
                totalViolations: 0,
                flags: [],
            };
            flagCache.set(playerId, record);
        }

        record.playerName = player.name;
        record.totalViolations += 1;

        // 2. Process flag entry stacking
        FlagManager.appendOrStackFlag(record, flagType, details, now, isoDate);

        // 3. Mark player dirty for background batch write
        dirtyPlayers.add(playerId);
    }

    /**
     * Helper to handle flag stacking vs creating a new entry.
     * Reduces cyclomatic complexity in logFlag.
     *
     * @param record - Target player record.
     * @param flagType - Detection category.
     * @param details - Context string.
     * @param now - Current epoch timestamp.
     * @param isoDate - Current ISO timestamp.
     */
    private static appendOrStackFlag(record: PlayerFlagRecord, flagType: string, details: string, now: number, isoDate: string): void {
        const lastFlag = record.flags[record.flags.length - 1];
        const isStackable = lastFlag && lastFlag.flagType === flagType && now - lastFlag.timestamp < FLAG_STACK_WINDOW_MS;

        if (isStackable) {
            lastFlag.count += 1;
            lastFlag.timestamp = now;
            lastFlag.date = isoDate;
            lastFlag.details = details;
            return;
        }

        const newEntry: ViolationFlagEntry = {
            flagType,
            details,
            timestamp: now,
            date: isoDate,
            count: 1,
        };
        record.flags.push(newEntry);
    }

    /**
     * Flushes modified player records to the database sequentially in the background.
     */
    public static async flushToDatabase(): Promise<void> {
        if (dirtyPlayers.size === 0) return;

        const targetPlayers = Array.from(dirtyPlayers);
        dirtyPlayers.clear();

        for (const playerId of targetPlayers) {
            await FlagManager.flushPlayerRecord(playerId);
        }
    }

    /**
     * Flushes an individual player record to persistent storage.
     *
     * @param playerId - Unique player target identifier.
     */
    private static async flushPlayerRecord(playerId: string): Promise<void> {
        const memoryRecord = flagCache.get(playerId);
        if (!memoryRecord) return;

        try {
            const dbRecord: PlayerFlagRecord = (await flagsDB.get(playerId)) ?? {
                playerName: memoryRecord.playerName,
                totalViolations: 0,
                flags: [],
            };

            dbRecord.playerName = memoryRecord.playerName;
            dbRecord.totalViolations = memoryRecord.totalViolations;
            dbRecord.flags = memoryRecord.flags;

            await flagsDB.set(playerId, dbRecord);
        } catch (err) {
            dirtyPlayers.add(playerId);
            console.warn(`[flag-manager] Failed to flush flags for player ID ${playerId}:`, err);
        }
    }

    /**
     * Scans and sanitizes player records in the database on startup.
     * Repairs structurally valid records and purges unreadable or corrupted entries while ignoring missing data.
     */
    public static async sanitizeDatabase(): Promise<void> {
        try {
            const allPropertyIds = world.getDynamicPropertyIds();

            for (const rawKey of allPropertyIds) {
                const playerId = FlagManager.extractPlayerId(rawKey);
                if (playerId) {
                    await FlagManager.verifyAndCacheKey(rawKey, playerId);
                }
            }
        } catch (err) {
            console.error("[flag-manager] Error during database integrity check:", err);
        }
    }

    /**
     * Extracts player ID from raw property key while skipping internal database index maps.
     *
     * @param rawKey - The key retrieved from world dynamic property IDs.
     * @returns Player ID string if valid, or null if internal DB key.
     */
    private static extractPlayerId(rawKey: string): string | null {
        // Skip internal database chunk pointer maps or metadata tables
        if (rawKey.includes("/pointers/") || rawKey.includes("/meta") || rawKey.endsWith("/pointers")) {
            return null;
        }

        const parts = rawKey.split("/");
        if (parts.length >= 2 && parts[0] === "flags") {
            return parts[1] ?? null;
        }

        return rawKey.startsWith("flags") ? rawKey : null;
    }

    /**
     * Verifies individual key integrity during sanitization.
     * Distinguishes between nonexistent/unpopulated keys and legitimately corrupted data.
     *
     * @param rawKey - Raw dynamic property ID.
     * @param playerId - Extracted target player ID.
     */
    private static async verifyAndCacheKey(rawKey: string, playerId: string): Promise<void> {
        try {
            const rawRecord = await flagsDB.get(playerId);

            // 1. Completely ignore unpopulated or missing dynamic property entries
            if (rawRecord === undefined || rawRecord === null) {
                return;
            }

            // 2. Load valid schema records into memory cache
            if (FlagManager.isValidRecord(rawRecord)) {
                flagCache.set(playerId, {
                    playerName: String(rawRecord.playerName ?? "Unknown"),
                    totalViolations: Number(rawRecord.totalViolations) || 0,
                    flags: Array.isArray(rawRecord.flags) ? rawRecord.flags : [],
                });
                return;
            }

            // 3. Purge key only when populated with malformed/corrupted data
            console.warn(`[flag-manager] Purging corrupted database key: ${rawKey}`);
            await flagsDB.delete(playerId);
        } catch (readErr) {
            console.error(`[flag-manager] Removing unreadable dynamic property: ${rawKey}`, readErr);
            world.setDynamicProperty(rawKey, undefined);
        }
    }

    /**
     * Helper to validate record schema structure.
     *
     * @param data - Raw database payload object.
     * @returns True if payload matches PlayerFlagRecord schema.
     */
    private static isValidRecord(data: unknown): data is PlayerFlagRecord {
        if (typeof data !== "object" || data === null) return false;

        const record = data as Partial<PlayerFlagRecord>;
        return typeof record.playerName === "string" && typeof record.totalViolations === "number" && Array.isArray(record.flags);
    }
}

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
 * Manages player violation flag operations, caching, and database persistence.
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
     */
    private static async flushPlayerRecord(playerId: string): Promise<void> {
        const memoryRecord = flagCache.get(playerId);
        if (!memoryRecord) return;

        try {
            const fetchedRecord = flagsDB ? await flagsDB.get(playerId) : undefined;
            const dbRecord: PlayerFlagRecord = fetchedRecord ?? {
                playerName: memoryRecord.playerName,
                totalViolations: 0,
                flags: [],
            };

            dbRecord.playerName = memoryRecord.playerName;
            dbRecord.totalViolations = memoryRecord.totalViolations;
            dbRecord.flags = memoryRecord.flags;

            if (flagsDB) {
                await flagsDB.set(playerId, dbRecord);
            }
        } catch (err) {
            dirtyPlayers.add(playerId);
            console.warn(`[Paradox] Failed to flush flags for player ID ${playerId}:`, err);
        }
    }

    /**
     * Scans and sanitizes the database on startup.
     * Ignores internal database pointer chunks and temporary staging keys.
     */
    public static async sanitizeDatabase(): Promise<void> {
        try {
            const allPropertyIds = world.getDynamicPropertyIds();

            // Filter for flag records while ignoring internal system keys (e.g., flags/pointers/0, flags/key~tmp)
            const flagKeys = allPropertyIds.filter((id) => {
                if (!id.startsWith("flags/") && id !== "flags") return false;

                const pathSegments = id.split("/");

                // Ignore database index pointers (flags/pointers, flags/pointers/0, etc.)
                if (pathSegments[1] === "pointers") return false;

                // Ignore sub-chunks or temporary staging keys
                if (id.includes("~tmp") || pathSegments.length > 2) return false;

                return true;
            });

            for (const rawKey of flagKeys) {
                const playerId = rawKey.includes("/") ? rawKey.split("/")[1] : rawKey;
                if (playerId) {
                    await FlagManager.verifyAndCacheKey(rawKey, playerId);
                }
            }
        } catch (err) {
            console.error("[Paradox] Error during database integrity check:", err);
        }
    }

    /**
     * Verifies individual key integrity during sanitization safely.
     */
    private static async verifyAndCacheKey(rawKey: string, playerId: string): Promise<void> {
        try {
            const rawRecord = flagsDB ? await flagsDB.get(playerId) : undefined;

            if (rawRecord && FlagManager.isValidRecord(rawRecord)) {
                flagCache.set(playerId, {
                    playerName: String(rawRecord.playerName ?? "Unknown"),
                    totalViolations: Number(rawRecord.totalViolations) || 0,
                    flags: Array.isArray(rawRecord.flags) ? rawRecord.flags : [],
                });
                return;
            }

            console.warn(`[Paradox] Purging corrupted database key: ${rawKey}`);
            if (flagsDB) {
                await flagsDB.delete(playerId);
            } else {
                world.setDynamicProperty(rawKey, undefined);
            }
        } catch (readErr) {
            console.error(`[Paradox] Removing unreadable dynamic property: ${rawKey}`, readErr);
            this.safePurgeDynamicProperty(rawKey);
        }
    }

    /**
     * Safely purges an unreadable or broken dynamic property identifier strictly without type casting.
     */
    private static safePurgeDynamicProperty(rawKey: string): void {
        try {
            if (flagsDB && "purgeUnreadableProperty" in flagsDB && typeof (flagsDB as { purgeUnreadableProperty?: Function }).purgeUnreadableProperty === "function") {
                (flagsDB as { purgeUnreadableProperty: (key: string) => boolean }).purgeUnreadableProperty(rawKey);
                return;
            }
            world.setDynamicProperty(rawKey, undefined);
        } catch (purgeErr) {
            console.error(`[Paradox] Emergency purge failed for key "${rawKey}":`, purgeErr);
        }
    }

    /**
     * Helper to validate record schema structure.
     */
    private static isValidRecord(data: unknown): data is PlayerFlagRecord {
        return (
            typeof data === "object" &&
            data !== null &&
            "playerName" in data &&
            typeof (data as PlayerFlagRecord).playerName === "string" &&
            "totalViolations" in data &&
            typeof (data as PlayerFlagRecord).totalViolations === "number" &&
            "flags" in data &&
            Array.isArray((data as PlayerFlagRecord).flags)
        );
    }
}

// Safely execute initialization AFTER class definition evaluation
FlagManager.init();

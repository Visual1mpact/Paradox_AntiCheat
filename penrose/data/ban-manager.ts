import { world } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";

/** Type definition for stored local bans */
export type LocalBanRecord = Record<string, any>;

/** Runtime cache storing lowercase banned player names for O(1) lookups */
let activeBans: Set<string> = new Set();

/**
 * Reads and parses the global ban list from dynamic world properties.
 * @returns {string[]} An array of globally banned player names.
 */
export function getGlobalBans(): string[] {
    try {
        const banData = world.getDynamicProperty("globalBannedPlayers") as string;
        if (!banData) return [];
        const parsed = JSON.parse(banData);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("[Paradox] Failed to read global ban list:", err);
        return [];
    }
}

/**
 * Saves the global ban list to dynamic properties and refreshes the runtime cache.
 * @param {string[]} bans - Array of player names to store as globally banned.
 */
export function saveGlobalBans(bans: string[]): void {
    try {
        world.setDynamicProperty("globalBannedPlayers", JSON.stringify(bans));
        refreshGlobalBanCache();
    } catch (err) {
        console.error("[Paradox] Failed to save global ban list:", err);
    }
}

/**
 * Retrieves the local ban record map from the banlist database.
 * @returns {Promise<LocalBanRecord>} Object mapping player names to ban metadata.
 */
export async function getLocalBans(): Promise<LocalBanRecord> {
    try {
        return (await banlistDB.get("players")) ?? {};
    } catch (err) {
        console.error("[Paradox] Failed to read local ban list:", err);
        return {};
    }
}

/**
 * Saves the local ban record map to the banlist database.
 * @param {LocalBanRecord} bans - Object containing local player ban data.
 */
export async function saveLocalBans(bans: LocalBanRecord): Promise<void> {
    try {
        await banlistDB.set("players", bans);
    } catch (err) {
        console.error("[Paradox] Failed to save local ban list:", err);
    }
}

/**
 * Refreshes the in-memory ban cache from the world's dynamic properties[cite: 1].
 */
export function refreshGlobalBanCache(): void {
    const banList = getGlobalBans();
    activeBans = new Set(banList.map((name) => name.toLowerCase()));
}

/**
 * Evaluates O(1) membership of a player name in the active global ban set[cite: 1].
 * @param {string} playerName - Player name to check.
 * @returns {boolean} True if globally banned.
 */
export function isGloballyBanned(playerName: string): boolean {
    return activeBans.has(playerName.toLowerCase());
}

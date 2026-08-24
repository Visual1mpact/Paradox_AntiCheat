import { Player } from "@minecraft/server";
import { flagsDB } from "../../event-listeners/world-initialize";
import { ViolationFlagEntry, PlayerFlagRecord } from "../database/db-types";

const FLAG_STACK_WINDOW_MS = 10000;

export class FlagManager {
    /**
     * Persists a violation flag for a player to the global database.
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

        try {
            // 1. Explicitly type record as an individual player entry
            const record: PlayerFlagRecord = (await flagsDB.get(playerId)) ?? {
                playerName: player.name,
                totalViolations: 0,
                flags: [],
            };

            record.playerName = player.name;
            record.totalViolations += 1;

            // 2. Stack entry if same flag type occurred within the stacking window
            const lastFlag = record.flags[record.flags.length - 1];
            if (lastFlag && lastFlag.flagType === flagType && now - lastFlag.timestamp < FLAG_STACK_WINDOW_MS) {
                lastFlag.count += 1;
                lastFlag.timestamp = now;
                lastFlag.date = isoDate;
                lastFlag.details = details;
            } else {
                const newEntry: ViolationFlagEntry = {
                    flagType,
                    details,
                    timestamp: now,
                    date: isoDate,
                    count: 1,
                };
                record.flags.push(newEntry);
            }

            // 3. Persist back to the database
            await flagsDB.set(playerId, record);
        } catch (err) {
            console.warn(`[Paradox] Failed to log ${flagType} flag for ${player.name}:`, err);
        }
    }
}

import { Player, system, world } from "@minecraft/server";

export interface CommandRestrictionRule {
    /** Unique key for the restriction (e.g., "imprisoned", "muted", "pvp_combat") */
    id: string;
    /** Message sent to player when command is denied (string or dynamic evaluator) */
    denialMessage: string | ((player: Player) => string);
    /** Condition returning true if the restriction applies to the player */
    isRestricted: (player: Player) => boolean;
    /** Commands or categories blocked by this rule */
    blockedCommands?: string[];
    blockedCategories?: string[];
}

/**
 * Converts seconds into a formatted human-readable duration string.
 *
 * @param {number} seconds - Total seconds to format.
 * @returns {string} Formatted duration string.
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    if (remainingSeconds > 0 || parts.length === 0) {
        parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`);
    }

    return parts.join(" ");
}

export class RestrictionManager {
    private static instance: RestrictionManager;
    private rules: Map<string, CommandRestrictionRule> = new Map();

    private constructor() {
        this.registerDefaultRules();
    }

    public static getInstance(): RestrictionManager {
        if (!RestrictionManager.instance) {
            RestrictionManager.instance = new RestrictionManager();
        }
        return RestrictionManager.instance;
    }

    /**
     * Register a new restriction rule into the system.
     */
    public registerRule(rule: CommandRestrictionRule): void {
        this.rules.set(rule.id, rule);
    }

    /**
     * Remove an existing restriction rule.
     */
    public unregisterRule(ruleId: string): void {
        this.rules.delete(ruleId);
    }

    /**
     * Checks if a command is blocked for a given player based on active restriction rules.
     * Evaluates in fast O(1) sequence per rule.
     *
     * @param {Player} player - Executing target player entity.
     * @param {string} commandName - Target command keyword.
     * @param {string} category - Command category string.
     * @returns {string | null} Denial message if restricted, or null if execution is allowed.
     */
    public checkRestriction(player: Player, commandName: string, category: string): string | null {
        const cmdLower = commandName.toLowerCase();
        const catLower = category.toLowerCase();

        for (const rule of this.rules.values()) {
            if (!rule.isRestricted(player)) continue;

            const isCmdBlocked = rule.blockedCommands?.some((c) => c.toLowerCase() === cmdLower);
            const isCatBlocked = rule.blockedCategories?.some((c) => c.toLowerCase() === catLower);

            if (isCmdBlocked || isCatBlocked) {
                return typeof rule.denialMessage === "function" ? rule.denialMessage(player) : rule.denialMessage;
            }
        }

        return null;
    }

    /**
     * Registers default conditions (Imprisonment & PvP Combat restrictions).
     */
    private registerDefaultRules(): void {
        // Imprisonment Rule
        this.registerRule({
            id: "imprisoned",
            denialMessage: "§o§c[Paradox] You cannot use teleportation commands while imprisoned!",
            isRestricted: (player: Player) => Boolean(player.getDynamicProperty("prisonLocation")),
            blockedCommands: ["home", "tpr", "tpa", "freecam"],
        });

        // PvP Combat Rule
        this.registerRule({
            id: "pvp",
            denialMessage: (player: Player) => {
                const lastCombatTick = (player.getDynamicProperty("lastPvPCombatTick") as number) ?? 0;
                const cooldownTicks = (world.getDynamicProperty("customPvPCooldown") as number) ?? 2400;
                const elapsedTicks = system.currentTick - lastCombatTick;
                const remainingSeconds = Math.ceil((cooldownTicks - elapsedTicks) / 20);

                return `§o§c[Paradox] You are in combat! PVP/PVE Toggle is disabled for ${formatTime(remainingSeconds)}.`;
            },
            isRestricted: (player: Player) => {
                const lastCombatTick = (player.getDynamicProperty("lastPvPCombatTick") as number) ?? 0;
                const cooldownTicks = (world.getDynamicProperty("customPvPCooldown") as number) ?? 2400;
                return system.currentTick - lastCombatTick < cooldownTicks;
            },
            blockedCommands: ["home", "tpr", "tpa", "freecam", "pvpSetCombatCD", "pvpSetToggleCD"],
        });
    }
}

export const restrictionManager = RestrictionManager.getInstance();

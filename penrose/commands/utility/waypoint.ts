import { ChatSendBeforeEvent, Player, system, world, Vector3, PlayerLeaveBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache, CachedPlayerTransform } from "../../classes/cache/player-location-cache";
import { waypointsDB } from "../../event-listeners/world-initialize";
import { WaypointData } from "../../classes/database/db-types";
import { EventCoordinator } from "../../classes/core/event-coordinator";

const LEGACY_WAYPOINT_PROP = "paradox:waypoint_data";
const DEFAULT_MAX_WAYPOINTS = 5;

interface PlayerWaypoints {
    activeWaypointName?: string;
    maxWaypoints?: number;
    savedWaypoints: Record<string, WaypointData>;
}

interface WaypointAdminFlags {
    targetName: string;
    isGlobal: boolean;
    limitVal?: number;
    resetLimit: boolean;
}

/** In-memory cache for fast, synchronous reads during HUD tick updates */
const waypointsMemoryCache = new Map<string, PlayerWaypoints>();

/** Active tracking count to short-circuit tick execution when no player is navigating */
let activeGpsCount = 0;

/**
 * Recalculates the active GPS target count across all loaded player caches.
 */
function updateActiveGpsCount(): void {
    let count = 0;
    for (const entry of waypointsMemoryCache.values()) {
        if (entry.activeWaypointName) {
            count++;
        }
    }
    activeGpsCount = count;
}

/**
 * Persists changes to memory cache and database for player waypoints.
 *
 * @param {string} playerId - Unique ID of target player.
 * @param {PlayerWaypoints} waypoints - PlayerWaypoints object to persist.
 */
async function savePlayerWaypoints(playerId: string, waypoints: PlayerWaypoints): Promise<void> {
    waypointsMemoryCache.set(playerId, waypoints);
    updateActiveGpsCount();
    await waypointsDB.set(playerId, waypoints);
}

/**
 * Gets cached player waypoints or loads them from the database into memory.
 *
 * @param {string} playerId - The unique ID of the target player.
 * @returns {Promise<PlayerWaypoints>} The target player's waypoints object.
 */
async function getOrLoadWaypoints(playerId: string): Promise<PlayerWaypoints> {
    const cached = waypointsMemoryCache.get(playerId);
    if (cached) return cached;

    const dbData = ((await waypointsDB.get(playerId)) as PlayerWaypoints | undefined) ?? { savedWaypoints: {} };
    waypointsMemoryCache.set(playerId, dbData);
    updateActiveGpsCount();
    return dbData;
}

/**
 * Helper to fetch the applicable maximum waypoint count for a specific player ID.
 * Hierarchy: Per-Player DB Override -> World Dynamic Property -> Default (5)
 *
 * @param {string} playerId - The unique ID of the target player.
 * @returns {Promise<number>} The effective max waypoint limit.
 */
async function getMaxWaypointsForPlayer(playerId: string): Promise<number> {
    const entry = await getOrLoadWaypoints(playerId);
    if (entry?.maxWaypoints !== undefined && entry.maxWaypoints > 0) {
        return entry.maxWaypoints;
    }
    const globalMax = world.getDynamicProperty("globalMaxWaypoints") as number | undefined;
    if (globalMax !== undefined && globalMax > 0) {
        return globalMax;
    }
    return DEFAULT_MAX_WAYPOINTS;
}

/**
 * Migrates legacy player dynamic property waypoint data into waypointsDB.
 *
 * @param {Player} player - The player entity to evaluate for migration.
 * @returns {Promise<PlayerWaypoints>} The updated player waypoints record.
 */
async function migrateLegacyWaypoints(player: Player): Promise<PlayerWaypoints> {
    let currentDBData = await getOrLoadWaypoints(player.id);

    const legacyRaw = player.getDynamicProperty(LEGACY_WAYPOINT_PROP) as string | undefined;
    if (legacyRaw) {
        try {
            const legacyData = JSON.parse(legacyRaw) as PlayerWaypoints;
            if (legacyData?.savedWaypoints) {
                currentDBData.savedWaypoints = {
                    ...legacyData.savedWaypoints,
                    ...currentDBData.savedWaypoints,
                };
                if (!currentDBData.activeWaypointName && legacyData.activeWaypointName) {
                    currentDBData.activeWaypointName = legacyData.activeWaypointName;
                }
                await savePlayerWaypoints(player.id, currentDBData);
            }
        } catch (e) {
            console.error(`[Paradox] Failed to parse legacy waypoint data for ${player.name}: ${e}`);
        } finally {
            player.setDynamicProperty(LEGACY_WAYPOINT_PROP, undefined);
        }
    }

    return currentDBData;
}

/**
 * Parses raw command arguments into structured admin flag metadata.
 *
 * @param {string[]} args - Raw string array of input parameters.
 * @returns {WaypointAdminFlags} Parsed flag metadata object.
 */
function parseAdminFlags(args: string[]): WaypointAdminFlags {
    let targetName = "";
    let isGlobal = false;
    let limitVal: number | undefined;
    let resetLimit = false;

    const validFlags = new Set(["-t", "--target", "-g", "--global", "-l", "--limit", "--reset-limit"]);
    const argsCopy = [...args];

    while (argsCopy.length > 0) {
        const flag = argsCopy.shift();
        switch (flag) {
            case "-g":
            case "--global":
                isGlobal = true;
                break;
            case "-t":
            case "--target": {
                let result = "";
                while (argsCopy.length > 0 && argsCopy[0] !== undefined && !validFlags.has(argsCopy[0])) {
                    result += (result ? " " : "") + argsCopy.shift();
                }
                targetName = result.replace(/["@]/g, "");
                break;
            }
            case "-l":
            case "--limit": {
                const valStr = argsCopy.shift();
                if (valStr) {
                    const parsed = parseInt(valStr, 10);
                    if (!isNaN(parsed) && parsed > 0) limitVal = parsed;
                }
                break;
            }
            case "--reset-limit":
                resetLimit = true;
                break;
        }
    }

    return {
        targetName,
        isGlobal,
        resetLimit,
        ...(limitVal !== undefined ? { limitVal } : {}),
    };
}

/**
 * Handles administrative overrides for global waypoint limits.
 *
 * @param {Player} player - Admin sender executing command.
 * @param {WaypointAdminFlags} flags - Parsed flag data.
 */
function handleGlobalLimitAdmin(player: Player, flags: WaypointAdminFlags): void {
    if (flags.resetLimit) {
        world.setDynamicProperty("globalMaxWaypoints", undefined);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Global waypoint limit reset to default (${DEFAULT_MAX_WAYPOINTS}).`);
        return;
    }

    if (flags.limitVal === undefined) {
        player.sendMessage(`§o§c[Paradox] Please specify a valid waypoint limit integer.`);
        return;
    }

    world.setDynamicProperty("globalMaxWaypoints", flags.limitVal);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Global waypoint limit set to ${flags.limitVal} for all players.`);
}

/**
 * Handles administrative overrides for specific player waypoint limits.
 *
 * @param {Player} player - Admin sender executing command.
 * @param {WaypointAdminFlags} flags - Parsed flag data.
 * @param {string} prefix - Active command prefix.
 */
async function handleTargetLimitAdmin(player: Player, flags: WaypointAdminFlags, prefix: string): Promise<void> {
    if (!flags.targetName) {
        player.sendMessage(`§o§c[Paradox] Usage: ${prefix}waypoint [ -g | -t <player> ] [ -l <limit> | --reset-limit ]`);
        return;
    }

    const targetPlayer = PlayerCache.getPlayerByName(flags.targetName);
    const targetId = targetPlayer ? targetPlayer.id : flags.targetName;
    const dbEntry = await getOrLoadWaypoints(targetId);

    if (flags.resetLimit) {
        delete dbEntry.maxWaypoints;
        await savePlayerWaypoints(targetId, dbEntry);

        const newLimit = await getMaxWaypointsForPlayer(targetId);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Reset waypoint limit override for "${flags.targetName}§7" (active limit: ${newLimit}).`);
        if (targetPlayer) {
            targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your waypoint limit override was reset by "${player.name}§7".`);
        }
        return;
    }

    if (flags.limitVal === undefined) {
        player.sendMessage(`§o§c[Paradox] Please specify a valid waypoint limit integer.`);
        return;
    }

    dbEntry.maxWaypoints = flags.limitVal;
    await savePlayerWaypoints(targetId, dbEntry);

    player.sendMessage(`§2[§7Paradox§2]§o§7 Set waypoint limit override for "${flags.targetName}§7" to ${flags.limitVal}.`);
    if (targetPlayer) {
        targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your waypoint limit was set to ${flags.limitVal} by "${player.name}§7".`);
    }
}

/**
 * Processes waypoint administration requests.
 *
 * @param {Player} player - Player sending command.
 * @param {string[]} args - Subcommand parameters.
 * @param {string} prefix - Current dynamic command prefix.
 */
async function handleWaypointAdmin(player: Player, args: string[], prefix: string): Promise<void> {
    const senderClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;
    if (senderClearance < 4) {
        player.sendMessage(`§o§c[Paradox] You do not have permission to modify waypoint limits.`);
        return;
    }

    const flags = parseAdminFlags(args);
    if (flags.isGlobal) {
        handleGlobalLimitAdmin(player, flags);
    } else {
        await handleTargetLimitAdmin(player, flags, prefix);
    }
}

/**
 * Subcommand handler: Set waypoint.
 *
 * @param {Player} player - Player executing the command.
 * @param {PlayerWaypoints} playerWaypoints - Active waypoints context object.
 * @param {number} maxWaypoints - Maximum allowed waypoint capacity.
 * @param {string} nameArg - User supplied target waypoint name.
 */
async function handleSetWaypoint(player: Player, playerWaypoints: PlayerWaypoints, maxWaypoints: number, nameArg: string): Promise<void> {
    const currentCount = Object.keys(playerWaypoints.savedWaypoints).length;
    const name = nameArg || "Home";

    if (!playerWaypoints.savedWaypoints[name] && currentCount >= maxWaypoints) {
        player.sendMessage(`§o§c[Paradox] You have reached your maximum limit of ${maxWaypoints} waypoints!`);
        return;
    }

    const playerTransform = PlayerLocationCache.getTransform(player);
    const loc = playerTransform?.location ?? player.location;
    const dimId = playerTransform?.dimension.id ?? player.dimension.id;

    playerWaypoints.savedWaypoints[name] = {
        name,
        location: { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) },
        dimension: dimId,
        timestamp: Date.now(),
    };

    await savePlayerWaypoints(player.id, playerWaypoints);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${name}§7" saved! (${Object.keys(playerWaypoints.savedWaypoints).length}/${maxWaypoints}). Use 'goto ${name}' to start GPS.`);
}

/**
 * Subcommand handler: Goto waypoint.
 *
 * @param {Player} player - Player executing the command.
 * @param {PlayerWaypoints} playerWaypoints - Active waypoints context object.
 * @param {string} nameArg - User supplied target waypoint name.
 * @param {string} prefix - Active command prefix string.
 */
async function handleGotoWaypoint(player: Player, playerWaypoints: PlayerWaypoints, nameArg: string, prefix: string): Promise<void> {
    if (!nameArg) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}waypoint goto <name>`);
        return;
    }
    if (!playerWaypoints.savedWaypoints[nameArg]) {
        player.sendMessage(`§o§c[Paradox] Waypoint "§f${nameArg}§c" not found.`);
        return;
    }

    playerWaypoints.activeWaypointName = nameArg;
    await savePlayerWaypoints(player.id, playerWaypoints);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Navigation activated for "§f${nameArg}§7".`);
}

/**
 * Subcommand handler: Rename waypoint.
 *
 * @param {Player} player - Player executing the command.
 * @param {PlayerWaypoints} playerWaypoints - Active waypoints context object.
 * @param {string[]} args - Full positional command arguments.
 * @param {string} prefix - Active command prefix string.
 */
async function handleRenameWaypoint(player: Player, playerWaypoints: PlayerWaypoints, args: string[], prefix: string): Promise<void> {
    const toIndex = args.indexOf("--to");
    if (toIndex === -1) {
        player.sendMessage(`§o§c[Paradox] Usage: ${prefix}waypoint rename <old> --to <new>`);
        return;
    }

    const oldName = args.slice(1, toIndex).join(" ").replace(/["@]/g, "").trim();
    const newName = args
        .slice(toIndex + 1)
        .join(" ")
        .replace(/["@]/g, "")
        .trim();

    if (!oldName || !newName) {
        player.sendMessage("§o§c[Paradox] Please provide both the current name and the new name.");
        return;
    }

    if (!playerWaypoints.savedWaypoints[oldName]) {
        player.sendMessage(`§o§c[Paradox] Waypoint "§f${oldName}§c" not found.`);
        return;
    }

    const wpData = playerWaypoints.savedWaypoints[oldName];
    wpData.name = newName;
    playerWaypoints.savedWaypoints[newName] = wpData;
    delete playerWaypoints.savedWaypoints[oldName];

    if (playerWaypoints.activeWaypointName === oldName) playerWaypoints.activeWaypointName = newName;

    await savePlayerWaypoints(player.id, playerWaypoints);
    player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${oldName}§7" renamed to "§f${newName}§7".`);
}

/**
 * Subcommand handler: Clear waypoint or active navigation.
 *
 * @param {Player} player - Player executing the command.
 * @param {PlayerWaypoints} playerWaypoints - Active waypoints context object.
 * @param {string} nameArg - Target waypoint name to delete if present.
 */
async function handleClearWaypoint(player: Player, playerWaypoints: PlayerWaypoints, nameArg: string): Promise<void> {
    if (nameArg) {
        if (playerWaypoints.savedWaypoints[nameArg]) {
            delete playerWaypoints.savedWaypoints[nameArg];
            if (playerWaypoints.activeWaypointName === nameArg) {
                delete playerWaypoints.activeWaypointName;
                player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${nameArg}§7" cleared and navigation stopped.`);
            } else {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${nameArg}§7" cleared.`);
            }
            await savePlayerWaypoints(player.id, playerWaypoints);
        } else {
            player.sendMessage(`§o§c[Paradox] Waypoint "§f${nameArg}§c" not found.`);
        }
        return;
    }

    if (playerWaypoints.activeWaypointName) {
        const clearedName = playerWaypoints.activeWaypointName;
        delete playerWaypoints.activeWaypointName;
        await savePlayerWaypoints(player.id, playerWaypoints);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Active navigation to "§f${clearedName}§7" stopped.`);
    } else {
        player.sendMessage("§o§c[Paradox] No active waypoint to clear.");
    }
}

/**
 * Subcommand handler: List saved waypoints directory.
 *
 * @param {Player} player - Player executing the command.
 * @param {PlayerWaypoints} playerWaypoints - Active waypoints context object.
 * @param {number} maxWaypoints - Maximum allowed waypoint capacity.
 */
function handleListWaypoints(player: Player, playerWaypoints: PlayerWaypoints, maxWaypoints: number): void {
    const savedNames = Object.keys(playerWaypoints.savedWaypoints);
    if (savedNames.length === 0) {
        player.sendMessage("§o§c[Paradox] §7You currently have no saved waypoints.");
        return;
    }

    const listOutput = [`§l§2--- Your Waypoint Directory (${savedNames.length}/${maxWaypoints}) ---`];
    for (const name of savedNames) {
        const wp = playerWaypoints.savedWaypoints[name];
        if (!wp) continue;
        const activeTag = playerWaypoints.activeWaypointName === name ? " §l§a[ACTIVE]§r" : "";
        const dimLabel = wp.dimension.replace("minecraft:", "").toUpperCase();

        listOutput.push(`§7• §f${wp.name}${activeTag}`);
        listOutput.push(`  §8└─ §7Pos: §f${wp.location.x}§7, §f${wp.location.y}§7, §f${wp.location.z} §8| §e${dimLabel}`);
    }
    listOutput.push(`§2------------------------------`);
    player.sendMessage(listOutput.join("\n"));
}

/**
 * Waypoint command providing a navigation HUD for Level 1+ players.
 */
export const waypointCommand: Command = {
    name: "waypoint",
    description: "Manages personal navigation waypoints with a directional HUD and configurable waypoint limits.",
    usage: "{prefix}waypoint <set [name] | goto [name] | clear [name] | list | rename <old> --to <new>> | {prefix}waypoint [ -t | --target <player> | -g | --global ] [ -l | --limit <amount> ] [ --reset-limit ]",
    examples: [
        "{prefix}waypoint set Base",
        "{prefix}waypoint rename Base --to HQ",
        "{prefix}waypoint goto Base",
        "{prefix}waypoint list",
        "{prefix}waypoint -g -l 10",
        "{prefix}waypoint -g --reset-limit",
        "{prefix}waypoint -t PlayerName -l 8",
        "{prefix}waypoint -t PlayerName --reset-limit",
    ],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/icon_recipe_nature.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Navigation Waypoint",
        description:
            "Manage personal navigation waypoints with a real-time directional HUD.\n\n" +
            "§7Management:\n" +
            "§7• Save unique locations with custom names.\n" +
            "§7• Select a destination via 'goto' to activate directional HUD tracking.\n" +
            "§7• Dimension-aware tracking ensures you're on the right path.\n" +
            "§7• Automatically stops navigation once you arrive at your destination.\n\n" +
            "§7Admin Management:\n" +
            "§7• Change waypoint limits globally or for specific target players (level 4 clearance).\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set New Waypoint",
                command: ["set"],
                description: "Set a marker at your current location.",
                requiredFields: ["waypointNameText"],
                generateModalForm: true,
                icon: "textures/ui/color_plus.png",
            },
            {
                name: "Rename Waypoint",
                command: ["rename"],
                description: "Change the name of a saved waypoint.",
                requiredFields: ["savedWaypointDropdown", "renameToText"],
                generateModalForm: true,
                icon: "textures/ui/sidebar_icons/realms.png",
            },
            {
                name: "Go To Saved Waypoint",
                command: ["goto"],
                description: "Activate navigation to an existing saved waypoint.",
                requiredFields: ["savedWaypointDropdown"],
                generateModalForm: true,
                icon: "textures/ui/NetherPortalMirror.png",
            },
            {
                name: "Clear Active Navigation",
                command: ["clear"],
                description: "Stop navigation to the currently active waypoint.",
                generateModalForm: false,
                icon: "textures/ui/cancel.png",
            },
            {
                name: "Delete Saved Waypoint",
                command: ["clear"],
                description: "Permanently remove a saved waypoint.",
                requiredFields: ["savedWaypointDropdown"],
                generateModalForm: true,
                icon: "textures/ui/icon_trash.png",
            },
            {
                name: "List All Waypoints",
                command: ["list"],
                description: "Show a list of all your saved waypoints.",
                generateModalForm: false,
                icon: "textures/ui/icon_map.png",
            },
            {
                name: "Set Global Waypoint Limit",
                icon: "textures/ui/world_glyph.png",
                description: "Set max waypoint limit globally for everyone (admin only).",
                securityClearance: 4,
                command: ["-g"],
                requiredFields: ["WaypointLimit"],
                generateModalForm: true,
            },
            {
                name: "Reset Global Waypoint Limit",
                icon: "textures/ui/backup_replace.png",
                description: "Reset global waypoint limit back to default (admin only).",
                securityClearance: 4,
                command: ["-g", "--reset-limit"],
                generateModalForm: false,
            },
            {
                name: "Set Player Waypoint Limit",
                icon: "textures/ui/editIcon.png",
                description: "Set max waypoint limit override for a target player (admin only).",
                securityClearance: 4,
                requiredFields: ["TargetPlayer", "WaypointLimit"],
                generateModalForm: true,
            },
            {
                name: "Reset Player Waypoint Limit",
                icon: "textures/ui/backup_replace.png",
                description: "Reset player waypoint limit override (admin only).",
                securityClearance: 4,
                command: ["--reset-limit"],
                requiredFields: ["TargetPlayer"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "Waypoint Name:",
                type: "text",
                placeholder: "e.g. Home",
                arg: "",
                requiredFields: ["waypointNameText"],
            },
            {
                name: "Select Waypoint:",
                type: "dropdown",
                sourceType: "playerWaypoints",
                arg: "",
                requiredFields: ["savedWaypointDropdown"],
            },
            {
                name: "Rename To:",
                type: "text",
                arg: "--to",
                requiredFields: ["renameToText"],
            },
            {
                type: "dropdown",
                sourceType: "players",
                name: "\nSelect Target Player:",
                arg: "--target",
                requiredFields: ["TargetPlayer"],
            },
            {
                type: "text",
                name: "\nInput Waypoint Limit:",
                placeholder: "Limit (e.g. 10)",
                arg: "--limit",
                requiredFields: ["WaypointLimit"],
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message || !message.sender) return;
        const player = message.sender;
        const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";

        const isAdminAction = args.some((arg) => ["-t", "--target", "-g", "--global", "-l", "--limit", "--reset-limit"].includes(arg));
        if (isAdminAction) {
            await handleWaypointAdmin(player, args, prefix);
            return;
        }

        const playerWaypoints = await migrateLegacyWaypoints(player);
        const playerMaxWaypoints = await getMaxWaypointsForPlayer(player.id);

        if (args.length === 0) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}waypoint <set [name] | goto [name] | clear [name] | list>`);
            return;
        }

        const action = args[0]?.toLowerCase();
        const waypointNameArg = args.slice(1).join(" ").replace(/["@]/g, "").trim();

        switch (action) {
            case "set":
                await handleSetWaypoint(player, playerWaypoints, playerMaxWaypoints, waypointNameArg);
                break;
            case "goto":
                await handleGotoWaypoint(player, playerWaypoints, waypointNameArg, prefix);
                break;
            case "rename":
                await handleRenameWaypoint(player, playerWaypoints, args, prefix);
                break;
            case "clear":
                await handleClearWaypoint(player, playerWaypoints, waypointNameArg);
                break;
            case "list":
            case "status":
                handleListWaypoints(player, playerWaypoints, playerMaxWaypoints);
                break;
            default:
                player.sendMessage(`§o§c[Paradox] Unknown sub-command. Usage: ${prefix}waypoint <set [name] | goto [name] | clear [name] | list>`);
        }
    },
};

/**
 * Directional logic to determine which arrow to show based on player transform and target position.
 *
 * @param {CachedPlayerTransform} transform - Cached position and rotation for the player.
 * @param {Vector3} target - Target vector location.
 * @returns {string} Arrow indicator string.
 */
function getDirectionArrow(transform: CachedPlayerTransform, target: Vector3): string {
    const dx = target.x - transform.location.x;
    const dz = target.z - transform.location.z;

    const targetAngle = Math.atan2(dz, dx) * (180 / Math.PI);
    const targetYaw = targetAngle - 90;

    let diff = (targetYaw - transform.rotation.y) % 360;
    if (diff < 0) diff += 360;

    if (diff >= 337.5 || diff < 22.5) return "↑";
    if (diff >= 22.5 && diff < 67.5) return "↗";
    if (diff >= 67.5 && diff < 112.5) return "→";
    if (diff >= 112.5 && diff < 157.5) return "↘";
    if (diff >= 157.5 && diff < 202.5) return "↓";
    if (diff >= 202.5 && diff < 247.5) return "↙";
    if (diff >= 247.5 && diff < 292.5) return "←";
    return "↖";
}

/**
 * Executes a single frame update cycle of HUD navigation display for a player.
 *
 * @param {Player} player - Target player entity.
 * @param {PlayerWaypoints} playerWaypoints - Player's waypoints object from memory cache.
 */
function updatePlayerHUDTick(player: Player, playerWaypoints: PlayerWaypoints): void {
    const activeWaypointName = playerWaypoints.activeWaypointName;
    if (!activeWaypointName) return;

    const wp = playerWaypoints.savedWaypoints[activeWaypointName];
    if (!wp) {
        delete playerWaypoints.activeWaypointName;
        savePlayerWaypoints(player.id, playerWaypoints);
        player.onScreenDisplay.setActionBar("");
        return;
    }

    const transform = PlayerLocationCache.getTransform(player);
    if (!transform) {
        player.onScreenDisplay.setActionBar("");
        return;
    }

    if (transform.dimension.id !== wp.dimension) {
        player.onScreenDisplay.setActionBar(`§bGPS §7| §f${wp.name} §7| §cWrong Dimension`);
        return;
    }

    const dx = transform.location.x - wp.location.x;
    const dz = transform.location.z - wp.location.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < 9 && Date.now() - wp.timestamp > 25000) {
        player.onScreenDisplay.setActionBar(`§bGPS §7| §aReached Destination!`);
        delete playerWaypoints.activeWaypointName;

        savePlayerWaypoints(player.id, playerWaypoints).then(() => {
            player.sendMessage(`§2[§7Paradox§2]§o§7 You have reached "§f${wp.name}§7".`);
        });
        return;
    }

    const dist = Math.floor(Math.sqrt(distSq));
    const arrow = getDirectionArrow(transform, wp.location);
    player.onScreenDisplay.setActionBar(`§l§bGPS §r§7| §f${wp.name} §7| §f${dist}m §7| §e${arrow}`);
}

/**
 * Background task to update the HUD for all players with active waypoints.
 */
export function startWaypointHUD() {
    EventCoordinator.subscribeBefore("playerLeave", (event: PlayerLeaveBeforeEvent) => {
        waypointsMemoryCache.delete(event.player.id);
        updateActiveGpsCount();
    });

    system.runInterval(() => {
        if (activeGpsCount <= 0) return;

        for (const player of PlayerCache.getPlayers()) {
            try {
                const playerWaypoints = waypointsMemoryCache.get(player.id);
                if (!playerWaypoints) {
                    getOrLoadWaypoints(player.id).then(() => migrateLegacyWaypoints(player));
                    continue;
                }

                updatePlayerHUDTick(player, playerWaypoints);
            } catch (e) {
                console.error(`[Paradox] Error in Waypoint HUD for player ${player.name}: ${e}`);
            }
        }
    }, 5);
}

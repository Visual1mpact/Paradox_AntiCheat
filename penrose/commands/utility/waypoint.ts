import { ChatSendBeforeEvent, Player, system, world, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";
import { waypointsDB } from "../../event-listeners/world-initialize";
import { WaypointData } from "../../classes/database/db-types";

const LEGACY_WAYPOINT_PROP = "paradox:waypoint_data";
const DEFAULT_MAX_WAYPOINTS = 5;

interface PlayerWaypoints {
    activeWaypointName?: string;
    maxWaypoints?: number;
    savedWaypoints: Record<string, WaypointData>;
}

/**
 * Helper to fetch the applicable maximum waypoint count for a specific player ID.
 * Hierarchy: Per-Player DB Override -> World Dynamic Property -> Default (5)
 */
async function getMaxWaypointsForPlayer(playerId: string): Promise<number> {
    const dbEntry = (await waypointsDB.get(playerId)) as PlayerWaypoints | undefined;
    if (dbEntry?.maxWaypoints !== undefined && dbEntry.maxWaypoints > 0) {
        return dbEntry.maxWaypoints;
    }
    const globalMax = world.getDynamicProperty("globalMaxWaypoints") as number | undefined;
    if (globalMax !== undefined && globalMax > 0) {
        return globalMax;
    }
    return DEFAULT_MAX_WAYPOINTS;
}

/**
 * Migrates legacy player dynamic property waypoint data into waypointsDB.
 */
async function migrateLegacyWaypoints(player: Player): Promise<PlayerWaypoints> {
    let currentDBData = ((await waypointsDB.get(player.id)) as PlayerWaypoints | undefined) ?? { savedWaypoints: {} };

    const legacyRaw = player.getDynamicProperty(LEGACY_WAYPOINT_PROP) as string | undefined;
    if (legacyRaw) {
        try {
            const legacyData = JSON.parse(legacyRaw) as PlayerWaypoints;
            if (legacyData?.savedWaypoints) {
                // Merge legacy waypoints into DB data without overwriting existing DB waypoints
                currentDBData.savedWaypoints = {
                    ...legacyData.savedWaypoints,
                    ...currentDBData.savedWaypoints,
                };
                if (!currentDBData.activeWaypointName && legacyData.activeWaypointName) {
                    currentDBData.activeWaypointName = legacyData.activeWaypointName;
                }
                await waypointsDB.set(player.id, currentDBData);
            }
        } catch (e) {
            console.error(`[Paradox] Failed to parse legacy waypoint data for ${player.name}: ${e}`);
        } finally {
            // Remove legacy property from player entity
            player.setDynamicProperty(LEGACY_WAYPOINT_PROP, undefined);
        }
    }

    return currentDBData;
}

/**
 * Waypoint command providing a navigation HUD for Level 1+ players.
 */
export const waypointCommand: Command = {
    name: "waypoint",
    description: "Manages personal navigation waypoints with a directional HUD and configurable waypoint limits.",
    usage: "{prefix}waypoint <set [name] [--no-gps] | goto [name] | clear [name] | list | rename <old> --to <new>> | {prefix}waypoint [ -t | --target <player> | -g | --global ] [ -l | --limit <amount> ] [ --reset-limit ]",
    examples: [
        "{prefix}waypoint set Base",
        "{prefix}waypoint set Secret --no-gps",
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
            "§7• Save unique locations with custom names for GPS tracking.\n" +
            "§7• View distance and direction to active targets on your action bar.\n" +
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
                requiredFields: ["waypointNameText", "noGpsToggle"],
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
                name: "Create Without GPS:",
                type: "toggle",
                arg: "--no-gps",
                requiredFields: ["noGpsToggle"],
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

        const senderClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

        // Flags handling for global or player limit adjustments
        if (args.includes("-t") || args.includes("--target") || args.includes("-g") || args.includes("--global") || args.includes("-l") || args.includes("--limit") || args.includes("--reset-limit")) {
            if (senderClearance < 4) {
                player.sendMessage(`§o§c[Paradox] You do not have permission to modify waypoint limits.`);
                return;
            }

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
                    case "--global": {
                        isGlobal = true;
                        break;
                    }
                    case "-t":
                    case "--target": {
                        let result = "";
                        while (argsCopy.length > 0 && !validFlags.has(argsCopy[0])) {
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
                            if (!isNaN(parsed) && parsed > 0) {
                                limitVal = parsed;
                            }
                        }
                        break;
                    }
                    case "--reset-limit": {
                        resetLimit = true;
                        break;
                    }
                }
            }

            // Global settings route
            if (isGlobal) {
                if (resetLimit) {
                    world.setDynamicProperty("globalMaxWaypoints", undefined);
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Global waypoint limit reset to default (${DEFAULT_MAX_WAYPOINTS}).`);
                    return;
                }

                if (limitVal === undefined) {
                    player.sendMessage(`§o§c[Paradox] Please specify a valid waypoint limit integer.`);
                    return;
                }

                world.setDynamicProperty("globalMaxWaypoints", limitVal);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Global waypoint limit set to ${limitVal} for all players.`);
                return;
            }

            // Individual player route
            if (!targetName) {
                player.sendMessage(`§o§c[Paradox] Usage: ${prefix}waypoint [ -g | -t <player> ] [ -l <limit> | --reset-limit ]`);
                return;
            }

            const targetPlayer = PlayerCache.getPlayerByName(targetName);
            const targetId = targetPlayer ? targetPlayer.id : targetName;

            const dbEntry = ((await waypointsDB.get(targetId)) as PlayerWaypoints | undefined) ?? { savedWaypoints: {} };

            if (resetLimit) {
                dbEntry.maxWaypoints = undefined;
                await waypointsDB.set(targetId, dbEntry);

                const newLimit = await getMaxWaypointsForPlayer(targetId);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Reset waypoint limit override for "${targetName}§7" (active limit: ${newLimit}).`);
                if (targetPlayer) {
                    targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your waypoint limit override was reset by "${player.name}§7".`);
                }
                return;
            }

            if (limitVal === undefined) {
                player.sendMessage(`§o§c[Paradox] Please specify a valid waypoint limit integer.`);
                return;
            }

            dbEntry.maxWaypoints = limitVal;
            await waypointsDB.set(targetId, dbEntry);

            player.sendMessage(`§2[§7Paradox§2]§o§7 Set waypoint limit override for "${targetName}§7" to ${limitVal}.`);
            if (targetPlayer) {
                targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your waypoint limit was set to ${limitVal} by "${player.name}§7".`);
            }
            return;
        }

        let playerWaypoints = await migrateLegacyWaypoints(player);
        const playerMaxWaypoints = await getMaxWaypointsForPlayer(player.id);

        if (args.length === 0) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}waypoint <set [name] | goto [name] | clear [name] | list>`);
            return;
        }

        const action = args[0].toLowerCase();

        const noGps = args.includes("--no-gps");
        const waypointNameArg = args
            .slice(1)
            .filter((a) => a.toLowerCase() !== "--no-gps")
            .join(" ")
            .replace(/["@]/g, "")
            .trim();

        switch (action) {
            case "set": {
                const currentWaypointCount = Object.keys(playerWaypoints.savedWaypoints).length;
                const name = waypointNameArg || "Home";

                if (!playerWaypoints.savedWaypoints[name] && currentWaypointCount >= playerMaxWaypoints) {
                    player.sendMessage(`§o§c[Paradox] You have reached your maximum limit of ${playerMaxWaypoints} waypoints!`);
                    return;
                }

                const newWaypoint: WaypointData = {
                    name,
                    location: { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) },
                    dimension: player.dimension.id,
                    timestamp: Date.now(),
                };
                playerWaypoints.savedWaypoints[name] = newWaypoint;
                if (!noGps) playerWaypoints.activeWaypointName = name;

                await waypointsDB.set(player.id, playerWaypoints);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${name}§7" set! (${Object.keys(playerWaypoints.savedWaypoints).length}/${playerMaxWaypoints}) ${!noGps ? "Navigation active." : ""}`);
                break;
            }
            case "goto": {
                if (!waypointNameArg) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}waypoint goto <name>`);
                    return;
                }
                const targetWaypoint = playerWaypoints.savedWaypoints[waypointNameArg];
                if (!targetWaypoint) {
                    player.sendMessage(`§o§c[Paradox] Waypoint "§f${waypointNameArg}§c" not found.`);
                    return;
                }
                playerWaypoints.activeWaypointName = waypointNameArg;
                await waypointsDB.set(player.id, playerWaypoints);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Navigation activated for "§f${waypointNameArg}§7".`);
                break;
            }
            case "rename": {
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

                await waypointsDB.set(player.id, playerWaypoints);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${oldName}§7" renamed to "§f${newName}§7".`);
                break;
            }
            case "clear": {
                if (waypointNameArg) {
                    if (playerWaypoints.savedWaypoints[waypointNameArg]) {
                        delete playerWaypoints.savedWaypoints[waypointNameArg];
                        if (playerWaypoints.activeWaypointName === waypointNameArg) {
                            playerWaypoints.activeWaypointName = undefined;
                            player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${waypointNameArg}§7" cleared and navigation stopped.`);
                        } else {
                            player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${waypointNameArg}§7" cleared.`);
                        }
                        await waypointsDB.set(player.id, playerWaypoints);
                    } else {
                        player.sendMessage(`§o§c[Paradox] Waypoint "§f${waypointNameArg}§c" not found.`);
                    }
                } else {
                    if (playerWaypoints.activeWaypointName) {
                        const clearedName = playerWaypoints.activeWaypointName;
                        playerWaypoints.activeWaypointName = undefined;
                        await waypointsDB.set(player.id, playerWaypoints);
                        player.sendMessage(`§2[§7Paradox§2]§o§7 Active navigation to "§f${clearedName}§7" stopped.`);
                    } else {
                        player.sendMessage("§o§c[Paradox] No active waypoint to clear.");
                    }
                }
                break;
            }
            case "list":
            case "status": {
                const savedNames = Object.keys(playerWaypoints.savedWaypoints);
                if (savedNames.length === 0) {
                    player.sendMessage("§o§c[Paradox] §7You currently have no saved waypoints.");
                    return;
                }

                const listOutput = [`§l§2--- Your Waypoint Directory (${savedNames.length}/${playerMaxWaypoints}) ---`];

                for (const name of savedNames) {
                    const wp = playerWaypoints.savedWaypoints[name];
                    const activeTag = playerWaypoints.activeWaypointName === name ? " §l§a[ACTIVE]§r" : "";
                    const dimLabel = wp.dimension.replace("minecraft:", "").toUpperCase();

                    listOutput.push(`§7• §f${wp.name}${activeTag}`);
                    listOutput.push(`  §8└─ §7Pos: §f${wp.location.x}§7, §f${wp.location.y}§7, §f${wp.location.z} §8| §e${dimLabel}`);
                }
                listOutput.push(`§2------------------------------`);
                player.sendMessage(listOutput.join("\n"));
                break;
            }
            default:
                player.sendMessage(`§o§c[Paradox] Unknown sub-command. Usage: ${prefix}waypoint <set [name] | goto [name] | clear [name] | list>`);
        }
    },
};

/**
 * Directional logic to determine which arrow to show based on player rotation.
 */
function getDirectionArrow(player: Player, target: Vector3): string {
    const dx = target.x - player.location.x;
    const dz = target.z - player.location.z;

    const targetAngle = Math.atan2(dz, dx) * (180 / Math.PI);
    const targetYaw = targetAngle - 90;

    let diff = (targetYaw - player.getRotation().y) % 360;
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
 * Background task to update the HUD for all players with active waypoints.
 */
export function startWaypointHUD() {
    system.runInterval(async () => {
        for (const player of PlayerCache.getPlayers()) {
            try {
                const playerWaypoints = await migrateLegacyWaypoints(player);
                const activeWaypointName = playerWaypoints.activeWaypointName;

                if (!activeWaypointName) {
                    player.onScreenDisplay.setActionBar("");
                    continue;
                }

                const wp = playerWaypoints.savedWaypoints[activeWaypointName];

                if (!wp) {
                    playerWaypoints.activeWaypointName = undefined;
                    await waypointsDB.set(player.id, playerWaypoints);
                    player.onScreenDisplay.setActionBar("");
                    continue;
                }

                if (player.dimension.id !== wp.dimension) {
                    player.onScreenDisplay.setActionBar(`§bGPS §7| §f${wp.name} §7| §cWrong Dimension`);
                    continue;
                }

                const dist = Math.floor(Math.sqrt(Math.pow(player.location.x - wp.location.x, 2) + Math.pow(player.location.z - wp.location.z, 2)));

                if (dist < 3 && Date.now() - wp.timestamp > 25000) {
                    player.onScreenDisplay.setActionBar(`§bGPS §7| §aReached Destination!`);
                    system.run(async () => {
                        player.sendMessage(`§2[§7Paradox§2]§o§7 You have reached "§f${wp.name}§7".`);
                        playerWaypoints.activeWaypointName = undefined;
                        await waypointsDB.set(player.id, playerWaypoints);
                    });
                    continue;
                }

                const arrow = getDirectionArrow(player, wp.location);
                player.onScreenDisplay.setActionBar(`§l§bGPS §r§7| §f${wp.name} §7| §f${dist}m §7| §e${arrow}`);
            } catch (e) {
                console.error(`[Paradox] Error in Waypoint HUD for player ${player.name}: ${e}`);
            }
        }
    }, 5);
}

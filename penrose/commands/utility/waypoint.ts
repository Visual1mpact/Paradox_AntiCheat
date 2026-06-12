import { ChatSendBeforeEvent, Player, system, world, Vector3 } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

const WAYPOINT_PROP = "paradox:waypoint_data";

interface WaypointData {
    name: string;
    location: Vector3;
    dimension: string;
    timestamp: number;
}

interface PlayerWaypoints {
    activeWaypointName?: string;
    savedWaypoints: Record<string, WaypointData>;
}

/**
 * Waypoint command providing a navigation HUD for Level 1+ players.
 */
export const waypointCommand: Command = {
    name: "waypoint",
    description: "Manages personal navigation waypoints with a directional HUD.",
    usage: "{prefix}waypoint <set [name] | goto [name] | clear [name] | list>",
    examples: ["{prefix}waypoint set Base", "{prefix}waypoint goto Base", "{prefix}waypoint clear Base", "{prefix}waypoint clear", "{prefix}waypoint list"],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/icon_recipe_nature.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Navigation Waypoint",
        description:
            "Manage personal navigation waypoints with a real-time directional HUD.\n\n" +
            "§7• Save unique locations with custom names for GPS tracking.\n" +
            "§7• View distance and direction to active targets on your action bar.\n" +
            "§7• Dimension-aware tracking ensures you're on the right path.\n" +
            "§7• Automatically stops navigation once you arrive at your destination.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set New Waypoint",
                command: ["set"],
                description: "Set a new marker at your current location and activate navigation.",
                requiredFields: ["newWaypointNameInput"],
                generateModalForm: true,
                icon: "textures/ui/color_plus.png",
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
        ],
        dynamicFields: [
            {
                name: "New Waypoint Name:",
                type: "text",
                placeholder: "e.g. Home",
                requiredFields: ["newWaypointNameInput"],
            },
            {
                name: "Select Waypoint:",
                type: "dropdown",
                sourceType: "playerWaypoints", // Custom source type for dynamic waypoint names
                requiredFields: ["savedWaypointDropdown"],
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const player = message.sender;
        const prefix = (world.getDynamicProperty("__prefix") as string) ?? "!";

        let playerWaypoints = getPlayerWaypoints(player);

        if (args.length === 0) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}waypoint <set [name] | goto [name] | clear [name] | list>`);
            return;
        }

        const action = args[0].toLowerCase();

        // Clean and join remaining arguments to form the waypoint name
        const waypointNameArg = args.slice(1).join(" ").replace(/["@]/g, "").trim();

        switch (action) {
            case "set": {
                const name = waypointNameArg || "Home";
                const newWaypoint: WaypointData = {
                    name,
                    location: { x: Math.floor(player.location.x), y: Math.floor(player.location.y), z: Math.floor(player.location.z) },
                    dimension: player.dimension.id,
                    timestamp: Date.now(),
                };
                playerWaypoints.savedWaypoints[name] = newWaypoint;
                playerWaypoints.activeWaypointName = name; // Make it active immediately
                setPlayerWaypoints(player, playerWaypoints);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${name}§7" set and activated! Navigation active.`);
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
                setPlayerWaypoints(player, playerWaypoints);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Navigation activated for "§f${waypointNameArg}§7".`);
                break;
            }
            case "clear": {
                if (waypointNameArg) {
                    // Clear a specific named waypoint
                    if (playerWaypoints.savedWaypoints[waypointNameArg]) {
                        delete playerWaypoints.savedWaypoints[waypointNameArg];
                        if (playerWaypoints.activeWaypointName === waypointNameArg) {
                            playerWaypoints.activeWaypointName = undefined; // Clear active if it was the one removed
                            player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${waypointNameArg}§7" cleared and navigation stopped.`);
                        } else {
                            player.sendMessage(`§2[§7Paradox§2]§o§7 Waypoint "§f${waypointNameArg}§7" cleared.`);
                        }
                        setPlayerWaypoints(player, playerWaypoints);
                    } else {
                        player.sendMessage(`§o§c[Paradox] Waypoint "§f${waypointNameArg}§c" not found.`);
                    }
                } else {
                    // Clear only the active waypoint
                    if (playerWaypoints.activeWaypointName) {
                        const clearedName = playerWaypoints.activeWaypointName;
                        playerWaypoints.activeWaypointName = undefined;
                        setPlayerWaypoints(player, playerWaypoints);
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
                    player.sendMessage("§o§c[Paradox] You have no saved waypoints.");
                    return;
                }
                player.sendMessage("§2[§7Paradox§2]§o§7 Your Saved Waypoints:");
                for (const name of savedNames) {
                    const wp = playerWaypoints.savedWaypoints[name];
                    const isActive = playerWaypoints.activeWaypointName === name ? " §a(Active)" : "";
                    player.sendMessage(` §o§7| §f${wp.name}§7 (@ ${wp.location.x}, ${wp.location.y}, ${wp.location.z} in ${wp.dimension})${isActive}`);
                }
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

    // Calculate target angle (0 is East in Math.atan2)
    const targetAngle = Math.atan2(dz, dx) * (180 / Math.PI);

    // MC Yaw: 0=S, 90=W, 180=N, -90=E
    // Convert target angle to MC-style yaw
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
    system.runInterval(() => {
        for (const player of world.getAllPlayers()) {
            try {
                const playerWaypoints = getPlayerWaypoints(player);
                const activeWaypointName = playerWaypoints.activeWaypointName;

                if (!activeWaypointName) {
                    // Clear action bar if no active waypoint
                    player.onScreenDisplay.setActionBar("");
                    continue;
                }

                const wp = playerWaypoints.savedWaypoints[activeWaypointName];

                if (!wp) {
                    // Active waypoint name exists but data is missing, clear active
                    playerWaypoints.activeWaypointName = undefined;
                    setPlayerWaypoints(player, playerWaypoints);
                    player.onScreenDisplay.setActionBar("");
                    continue;
                }

                if (player.dimension.id !== wp.dimension) {
                    player.onScreenDisplay.setActionBar(`§bGPS §7| §f${wp.name} §7| §cWrong Dimension`);
                    continue;
                }

                const dist = Math.floor(Math.sqrt(Math.pow(player.location.x - wp.location.x, 2) + Math.pow(player.location.z - wp.location.z, 2)));

                // If within 3 blocks, notify and clear (ignore if waypoint was set in the last 10 seconds)
                if (dist < 3 && Date.now() - wp.timestamp > 25000) {
                    player.onScreenDisplay.setActionBar(`§bGPS §7| §aReached Destination!`);
                    system.run(() => {
                        player.sendMessage(`§2[§7Paradox§2]§o§7 You have reached "§f${wp.name}§7".`);
                        playerWaypoints.activeWaypointName = undefined; // Clear active waypoint
                        setPlayerWaypoints(player, playerWaypoints);
                    });
                    continue;
                }

                const arrow = getDirectionArrow(player, wp.location);
                player.onScreenDisplay.setActionBar(`§l§bGPS §r§7| §f${wp.name} §7| §f${dist}m §7| §e${arrow}`);
            } catch (e) {
                // Fail silently to prevent loop crashes
                console.error(`[Paradox] Error in Waypoint HUD for player ${player.name}: ${e}`);
                player.setDynamicProperty(WAYPOINT_PROP, undefined); // Clear all waypoint data for this player
            }
        }
    }, 5);
}

// Helper to get player waypoints
function getPlayerWaypoints(player: Player): PlayerWaypoints {
    const raw = player.getDynamicProperty(WAYPOINT_PROP) as string | undefined;
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as PlayerWaypoints;
            // Ensure savedWaypoints is initialized if it somehow got corrupted
            if (!parsed.savedWaypoints) parsed.savedWaypoints = {};
            return parsed;
        } catch (e) {
            console.error(`[Paradox] Failed to parse waypoint data for ${player.name}: ${e}`);
            // Reset corrupted data
            return { savedWaypoints: {} };
        }
    }
    return { savedWaypoints: {} };
}

// Helper to set player waypoints
function setPlayerWaypoints(player: Player, data: PlayerWaypoints) {
    player.setDynamicProperty(WAYPOINT_PROP, JSON.stringify(data));
}

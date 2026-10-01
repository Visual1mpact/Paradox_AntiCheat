import { Player, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

/**
 * Result structure for parsed coordinate arguments.
 */
interface CoordinateTarget {
    readonly player: Player;
    readonly location: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * Result structure for parsed player-to-player arguments.
 */
interface PlayerTargetPair {
    readonly source: Player;
    readonly destination: Player;
}

/**
 * Cleans and trims raw command argument strings.
 *
 * @param {string} name - Raw string.
 * @returns {string} Cleaned string.
 */
function cleanName(name: string): string {
    return name.trim().replace(/["@]/g, "");
}

/**
 * Attempts to parse player and numeric X, Y, Z coordinates from arguments.
 *
 * @param {readonly string[]} args - Cleaned arguments array.
 * @returns {CoordinateTarget | undefined} Parsed player and location, or undefined if invalid.
 */
function parseCoordinates(args: readonly string[]): CoordinateTarget | undefined {
    if (args.length < 4) return undefined;

    const zStr = args[args.length - 1];
    const yStr = args[args.length - 2];
    const xStr = args[args.length - 3];

    if (!zStr || !yStr || !xStr) return undefined;

    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    const z = parseFloat(zStr);

    if (isNaN(x) || isNaN(y) || isNaN(z)) return undefined;

    const playerName = args.slice(0, args.length - 3).join(" ");
    const player = PlayerCache.getPlayerByName(playerName);

    if (!player || !player.isValid) return undefined;

    return { player, location: { x, y, z } };
}

/**
 * Determines player-to-player targets based on positional argument splits.
 *
 * @param {readonly string[]} args - Cleaned arguments array.
 * @returns {PlayerTargetPair | undefined} Pair of players, or undefined if not resolved.
 */
function parsePlayerPair(args: readonly string[]): PlayerTargetPair | undefined {
    const len = args.length;
    if (len < 2) return undefined;

    if (len === 2) {
        const p1 = PlayerCache.getPlayerByName(args[0]!);
        const p2 = PlayerCache.getPlayerByName(args[1]!);
        if (p1?.isValid && p2?.isValid) return { source: p1, destination: p2 };
        return undefined;
    }

    for (let splitIndex = 1; splitIndex < len; splitIndex++) {
        const name1 = args.slice(0, splitIndex).join(" ");
        const name2 = args.slice(splitIndex).join(" ");

        const p1 = PlayerCache.getPlayerByName(name1);
        const p2 = PlayerCache.getPlayerByName(name2);

        if (p1?.isValid && p2?.isValid) {
            return { source: p1, destination: p2 };
        }
    }

    return undefined;
}

/**
 * Executes player-to-player teleportation with location cache lookup and safety checks.
 *
 * @param {ChatSendBeforeEvent} message - Message context.
 * @param {Player} source - Source player to teleport.
 * @param {Player} destination - Destination target player.
 */
function executePlayerTeleport(message: ChatSendBeforeEvent, source: Player, destination: Player): void {
    const transform = PlayerLocationCache.getTransform(destination);
    const location = transform?.location ?? destination.location;
    const dimension = transform?.dimension ?? destination.dimension;
    const rotation = transform?.rotation ?? destination.getRotation();

    const result = source.tryTeleport(location, {
        dimension,
        rotation,
        facingLocation: destination.getViewDirection(),
        checkForBlocks: true,
        keepVelocity: false,
    });

    if (!result) {
        message.sender.sendMessage("§o§c[Paradox] Unable to teleport. Please try again.");
    } else {
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleported '${source.name}§7' to '${destination.name}§7'.`);
    }
}

/**
 * Executes coordinate-based teleportation for a player.
 *
 * @param {ChatSendBeforeEvent} message - Message context.
 * @param {Player} target - Target player to teleport.
 * @param {{ x: number; y: number; z: number }} location - Destination grid coordinates.
 */
function executeCoordinateTeleport(message: ChatSendBeforeEvent, target: Player, location: { readonly x: number; readonly y: number; readonly z: number }): void {
    const result = target.tryTeleport(location, {
        checkForBlocks: true,
        keepVelocity: false,
    });

    if (!result) {
        message.sender.sendMessage("§o§c[Paradox] Unable to teleport to destination coordinates. Check for obstructive blocks.");
    } else {
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleported '${target.name}§7' to X: ${location.x}, Y: ${location.y}, Z: ${location.z}.`);
    }
}

/**
 * Represents the tpa command with player-to-player and grid coordinate teleportation capabilities.
 */
export const tpaCommand: Command = {
    name: "tpa",
    description: "Assistance to teleport a player to another player or directly to grid coordinates.",
    usage: "{prefix}tpa <player> <player | x y z>",
    examples: [`{prefix}tpa Lucy Steve`, `{prefix}tpa Lucy 100 64 -200`, `{prefix}tpa @Steve @Lucy`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/blocks/end_portal.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Teleport Assistance (TPA)",
        description:
            "Administratively relocate one player directly to another player or specific grid coordinates.\n\n" +
            "§7• Teleport to Player: Relocates the source player directly to the target player.\n" +
            "§7• Teleport to Coordinates: Relocates the source player directly to explicit X, Y, Z coordinates.\n" +
            "§7• Synchronizes dimension, rotation, and view direction when targeting players.\n" +
            "§7• Includes safety checks to prevent teleporting into solid blocks.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Teleport to Player",
                command: undefined,
                description: "Choose source and destination players.",
                requiredFields: ["playerSelection", "targetPlayerSelection"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
            {
                name: "Teleport to Coordinates",
                command: undefined,
                description: "Choose source player and target X, Y, Z grid coordinates.",
                requiredFields: ["playerSelection", "xCoordinate", "yCoordinate", "zCoordinate"],
                generateModalForm: true,
                icon: "textures/items/compass_item.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nTeleport Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerSelection"],
            },
            {
                name: "\nDestination Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["targetPlayerSelection"],
            },
            {
                name: "\nX Coordinate",
                type: "text",
                requiredFields: ["xCoordinate"],
            },
            {
                name: "\nY Coordinate",
                type: "text",
                requiredFields: ["yCoordinate"],
            },
            {
                name: "\nZ Coordinate",
                type: "text",
                requiredFields: ["zCoordinate"],
            },
        ],
    },

    /**
     * Executes the tpa command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []): void => {
        if (!message) return;

        const cleanedArgs = args.map(cleanName);

        const coordTarget = parseCoordinates(cleanedArgs);
        if (coordTarget) {
            executeCoordinateTeleport(message, coordTarget.player, coordTarget.location);
            return;
        }

        const playerPair = parsePlayerPair(cleanedArgs);
        if (playerPair) {
            executePlayerTeleport(message, playerPair.source, playerPair.destination);
            return;
        }

        message.sender.sendMessage("§o§c[Paradox] Invalid arguments. Provide two player names or a player name followed by X Y Z coordinates.");
    },
};

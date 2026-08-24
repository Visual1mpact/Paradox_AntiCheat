import { Player, ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

/**
 * Represents the tpa command.
 */
export const tpaCommand: Command = {
    name: "tpa",
    description: "Assistance to teleport to a player or vice versa.",
    usage: "{prefix}tpa <player> <player>",
    examples: [`{prefix}tpa Lucy Steve`, `{prefix}tpa @Steve @Lucy`, `{prefix}tpa help`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/blocks/end_portal.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Teleport Assistance (TPA)",
        description:
            "Administratively relocate one player directly to the location of another.\n\n" +
            "§7• Transfers the 'From' player to the exact coordinates of the 'To' player.\n" +
            "§7• Synchronizes dimension, rotation, and view direction for a seamless transition.\n" +
            "§7• Includes safety checks to prevent teleporting into solid blocks.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Select Players",
                command: undefined,
                description: "Choose the players to teleport to/from.",
                requiredFields: ["playerSelection"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nTeleport From:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerSelection"],
            },
            {
                name: "\nTeleport To:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerSelection"],
            },
        ],
    },

    /**
     * Executes the tpa command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        // Prevent command if player is imprisoned
        const isImprisoned = message.sender.getDynamicProperty("prisonLocation"); // matches PRISON_LOCATION_PROPERTY
        if (isImprisoned) {
            message.sender.sendMessage(`§o§c[Paradox] You cannot use the tpa command while imprisoned!`);
            return;
        }

        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player | undefined} The player object corresponding to the provided player name, or undefined if not found.
         */
        function getPlayerObject(playerName: string): Player | undefined {
            return PlayerCache.getPlayerByName(playerName);
        }

        /**
         * Cleans and trims a player name string.
         * @param {string} name - The player name to clean.
         * @returns {string} The cleaned player name.
         */
        function cleanName(name: string): string {
            return name.trim().replace(/["@]/g, "");
        }

        /**
         * Determines player names from arguments and retrieves corresponding player objects.
         * @param {string[]} args - The command arguments.
         * @returns {[Player | undefined, Player | undefined]} The player objects corresponding to the provided arguments.
         */
        function determinePlayers(args: string[]): [Player | undefined, Player | undefined] {
            const [arg1, arg2, arg3, arg4] = args.map(cleanName);

            if (args.length === 2) {
                return [getPlayerObject(arg1), getPlayerObject(arg2)];
            }

            if (args.length === 4) {
                return [getPlayerObject(`${arg1} ${arg2}`), getPlayerObject(`${arg3} ${arg4}`)];
            }

            if (args.length === 3) {
                const possibleNames = [
                    [`${arg1} ${arg2}`, arg3],
                    [arg1, `${arg2} ${arg3}`],
                ];

                for (const [name1, name2] of possibleNames) {
                    const player1 = getPlayerObject(name1);
                    const player2 = getPlayerObject(name2);
                    if (player1 && player1.isValid && player2 && player2.isValid) {
                        return [player1, player2];
                    }
                }
            }

            return [undefined, undefined];
        }

        const [target1, target2] = determinePlayers(args);

        if (!target1 || !target2) {
            message.sender.sendMessage("§o§c[Paradox] Please provide at least two valid player names.");
            return;
        }

        if (!target1.isValid) {
            message.sender.sendMessage(`§o§c[Paradox] Player '${target1.name}§c' not found or not valid.`);
            return;
        }

        if (!target2.isValid) {
            message.sender.sendMessage(`§o§c[Paradox] Player '${target2.name}§c' not found or not valid.`);
            return;
        }

        // Fetch target2 transform from location cache
        const transform2 = PlayerLocationCache.getTransform(target2);
        const destinationLocation = transform2?.location ?? target2.location;
        const destinationDimension = transform2?.dimension ?? target2.dimension;
        const destinationRotation = transform2?.rotation ?? target2.getRotation();

        const result = target1.tryTeleport(destinationLocation, {
            dimension: destinationDimension,
            rotation: destinationRotation,
            facingLocation: target2.getViewDirection(),
            checkForBlocks: true,
            keepVelocity: false,
        });

        if (!result) {
            message.sender.sendMessage("§o§c[Paradox] Unable to teleport. Please try again.");
        } else {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleported '${target1.name}§7' to '${target2.name}§7'.`);
        }
    },
};

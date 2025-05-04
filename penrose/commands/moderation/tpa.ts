import { Player, ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

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
        description: "Teleport to a player or assist them in teleporting.\n\n",
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
                name: "Teleport From:",
                arg: undefined,
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerSelection"],
            },
            {
                name: "Teleport To:",
                arg: undefined,
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerSelection"],
            },
        ],
    },

    /**
     * Executes the tpa command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        /**
         * Function to look up a player by name and retrieve the player object.
         * @param {string} playerName - The name of the player to look up.
         * @returns {Player | undefined} The player object corresponding to the provided player name, or undefined if not found.
         */
        function getPlayerObject(playerName: string): Player | undefined {
            return world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        /**
         * Cleans and trims a player name string.
         * @param {string} name - The player name to clean.
         * @returns {string} The cleaned player name.
         */
        function cleanName(name: string): string {
            return name.replace(/[@"]/g, "").trim();
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
            message.sender.sendMessage("§o§cPlease provide at least two valid player names.");
            return;
        }

        if (!target1.isValid) {
            message.sender.sendMessage(`§o§cPlayer '${target1.name}§c' not found or not valid.`);
            return;
        }

        if (!target2.isValid) {
            message.sender.sendMessage(`§o§cPlayer '${target2.name}§c' not found or not valid.`);
            return;
        }

        const result = target1.tryTeleport(target2.location, {
            dimension: target2.dimension,
            rotation: target2.getRotation(),
            facingLocation: target2.getViewDirection(),
            checkForBlocks: true,
            keepVelocity: false,
        });

        if (!result) {
            message.sender.sendMessage("§o§cUnable to teleport. Please try again.");
        } else {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Teleported '${target1.name}§7' to '${target2.name}§7'.`);
        }
    },
};

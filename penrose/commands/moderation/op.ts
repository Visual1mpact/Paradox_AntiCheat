import { ChatSendBeforeEvent, Player, World } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { addPlayerToSecurityClearanceList } from "../../utility/level-4-security-tracker";

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

/**
 * Represents the op command.
 */
export const opCommand: Command = {
    name: "op",
    description: "Grant a player Paradox-Op!",
    usage: "{prefix}op <player> | {prefix}op list",
    examples: [`{prefix}op`, `{prefix}op Player Name`, `{prefix}op "Player Name"`, `{prefix}op help`, `{prefix}op list`],
    category: "Moderation",
    securityClearance: 4,

    /**
     * Executes the op command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment): void => {
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const sender = message.sender;
        const securityCheck = sender.getDynamicProperty("securityClearance") as number;

        /**
         * Prompts the player to enter their password and verifies it.
         * @param {Player} player - The player to whom the GUI should be displayed.
         * @returns {Promise<boolean>} - A Promise that resolves to true if the password is correct, false otherwise.
         */
        const promptForPassword = (player: Player): Promise<boolean> => {
            return new Promise((resolve, reject) => {
                const showPasswordPrompt = () => {
                    const passwordGui = minecraftEnvironment.initializeModalFormData();
                    passwordGui.title("Paradox Op");
                    passwordGui.textField("\nEnter Password:", "Enter Password");

                    passwordGui
                        .show(player)
                        .then((result) => {
                            if (result && result.canceled && result.cancelationReason === "UserBusy") {
                                showPasswordPrompt();
                                return;
                            }

                            const formValues = result?.formValues || [];
                            if (formValues.length === 0) {
                                resolve(false);
                                return;
                            }

                            const [enteredPassword] = formValues;
                            const storedPassword = world.getDynamicProperty("paradoxPassword") as string;

                            if (enteredPassword === storedPassword) {
                                resolve(true);
                            } else {
                                player.sendMessage("§cIncorrect password. Please try again.");
                                showPasswordPrompt();
                            }
                        })
                        .catch((error: Error) => {
                            console.error("Paradox Unhandled Rejection: ", error);
                            reject(error);
                        });
                };

                showPasswordPrompt();
            });
        };

        /**
         * Adds a player's name and ID to the security clearance list.
         * @param {Player} player - The player to add.
         */
        const addPlayerToSecurityList = (player: Player) => {
            const moduleKey = "paradoxOPSEC";
            const securityClearanceListKey = "securityClearanceList";
            const securityListObject = world.getDynamicProperty(moduleKey) as string;
            const securityClearanceListData: SecurityClearanceData = securityListObject ? JSON.parse(securityListObject) : { securityClearanceList: [] };
            const securityClearanceList = securityClearanceListData[securityClearanceListKey] ?? [];

            const playerInfo: PlayerInfo = {
                name: player.name,
                id: player.id,
            };

            if (securityClearanceList.length === 0) {
                securityClearanceListData.host = playerInfo; // Assign the first player as the host
            }

            if (!securityClearanceList.some((item: PlayerInfo) => item.id === player.id)) {
                securityClearanceList.push(playerInfo);
                securityClearanceListData[securityClearanceListKey] = securityClearanceList;
                world.setDynamicProperty(moduleKey, JSON.stringify(securityClearanceListData));
            }
            addPlayerToSecurityClearanceList(player);
        };

        /**
         * Displays the list of players with security clearance level 4.
         * @param {Player} player - The player requesting the list.
         */
        const displaySecurityList = (player: Player) => {
            const moduleKey = "paradoxOPSEC";
            const securityClearanceListData: SecurityClearanceData = JSON.parse(world.getDynamicProperty(moduleKey) as string);
            const securityClearanceList = securityClearanceListData.securityClearanceList ?? [];

            const hostInfo = securityClearanceListData.host ? `§2Host§7: ${securityClearanceListData.host.name} (§2ID§7: ${securityClearanceListData.host.id})` : "Host: §2None";

            const formattedList = securityClearanceList.map((item: PlayerInfo, index: number) => `§2${index + 1}§7. ${item.name} (§2ID§7: ${item.id})`).join("\n");

            player.sendMessage(`\n§2[§7Paradox§2]§o§7 ${hostInfo}\n\nPlayers with Security Clearance 4:\n§2-------------------------------§7\n${formattedList}`);
        };

        /**
         * The remaining logic to be executed after password validation.
         * @param {Player} player - The player to whom the GUI should be displayed.
         */
        const continueOpCommand = (player: Player) => {
            if (!securityCheck) {
                player.setDynamicProperty("securityClearance", 4);
                player.sendMessage("§2[§7Paradox§2]§o§7 You have updated your security clearance to level 4.");
                addPlayerToSecurityList(player);
                return;
            }

            let targetPlayer: Player | undefined = undefined;
            const playerName: string = args.join(" ").trim().replace(/["@]/g, "");

            if (playerName.length > 0) {
                targetPlayer = world.getAllPlayers().find((playerObject: Player) => playerObject.name === playerName);
            }

            if (!targetPlayer && playerName.length === 0) {
                targetPlayer = player;
            }

            if (!targetPlayer) {
                player.sendMessage(`§cPlayer "${playerName}" not found.`);
                return;
            }

            if (targetPlayer.name !== player.name) {
                targetPlayer.setDynamicProperty("securityClearance", 4);
                targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Your security clearance has been updated by ${player.name}!`);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Security clearance has been updated for ${targetPlayer.name}!`);
                addPlayerToSecurityList(targetPlayer);
                return;
            }

            player.sendMessage("§2[§7Paradox§2]§o§7 You have executed the OP command. Please close this window.");

            const opFailGui = (player: Player, world: World): void => {
                const failGui = minecraftEnvironment.initializeMessageFormData();
                failGui.title("                 Paradox Op");
                failGui.body("§2[§7Paradox§2]§o§7 Please enter a new password again. Your confirmed password did not match!");
                failGui.button1("Ok");
                failGui.button2("Cancel");

                failGui
                    .show(player)
                    .then((result) => {
                        if (result && (result.canceled || result.selection === 1)) {
                            return;
                        } else {
                            openOpGui(player, world);
                        }
                    })
                    .catch((error: Error) => {
                        console.error("Paradox Unhandled Rejection: ", error);
                        if (error instanceof Error) {
                            // Check if error.stack exists before trying to split it
                            if (error.stack) {
                                const stackLines: string[] = error.stack.split("\n");
                                if (stackLines.length > 1) {
                                    const sourceInfo: string[] = stackLines;
                                    console.error("Error originated from:", sourceInfo[0]);
                                }
                            }
                        }
                    });
            };

            const openOpGui = (player: Player, world: World): void => {
                const opGui = minecraftEnvironment.initializeModalFormData();
                opGui.title("Paradox Op");
                opGui.textField("\nNew Password:", "Enter Password");
                opGui.textField("\nConfirm New Password:", "Enter Password");

                opGui
                    .show(player)
                    .then((result) => {
                        if (result && result.canceled && result.cancelationReason === "UserBusy") {
                            return openOpGui(player, world);
                        }

                        const formValues = result?.formValues ?? [];
                        if (formValues.length === 0) {
                            return;
                        }

                        const [newPassword, confirmPassword] = formValues;
                        if (newPassword !== confirmPassword) {
                            opFailGui(player, world);
                        } else {
                            player.setDynamicProperty("securityClearance", 4);
                            world.setDynamicProperty("paradoxPassword", confirmPassword);
                            player.sendMessage("§2[§7Paradox§2]§o§7 Your security clearance has been updated!");
                            addPlayerToSecurityList(player);
                        }
                    })
                    .catch((error: Error) => {
                        console.error("Paradox Unhandled Rejection: ", error);
                        if (error instanceof Error) {
                            // Check if error.stack exists before trying to split it
                            if (error.stack) {
                                const stackLines: string[] = error.stack.split("\n");
                                if (stackLines.length > 1) {
                                    const sourceInfo: string[] = stackLines;
                                    console.error("Error originated from:", sourceInfo[0]);
                                }
                            }
                        }
                    });
            };

            system.run(() => {
                openOpGui(player, world);
            });
        };

        if (args[0] === "list") {
            displaySecurityList(sender);
            return;
        }

        const pass = world.getDynamicProperty("paradoxPassword") as string;
        // Retrieve and parse security clearance list data
        const moduleKey = "paradoxOPSEC";
        const securityListObject = world.getDynamicProperty(moduleKey) as string;
        const securityClearanceListData: SecurityClearanceData = securityListObject ? JSON.parse(securityListObject) : { securityClearanceList: [] };
        if (pass && (securityCheck === 4 || securityClearanceListData.host.id === message.sender.id)) {
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 You have executed the OP command. Please close this window.");
            system.run(() => {
                promptForPassword(message.sender)
                    .then((validated) => {
                        if (!validated) {
                            message.sender.sendMessage("§cPassword validation failed.");
                            return;
                        }
                        continueOpCommand(message.sender);
                    })
                    .catch((error) => {
                        console.error("Password validation failed: ", error);
                    });
            });
            return;
        } else if (pass && securityCheck < 4) {
            message.sender.sendMessage("§cYou do not have permissions!");
            return;
        }
        continueOpCommand(message.sender);
    },
};

import { ChatSendBeforeEvent, Player, World } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";

export const opCommand: Command = {
    name: "op",
    description: "Give yourself Paradox-Op!",
    usage: "!op",
    examples: [`!op`, `!op help`],
    execute: (message, _, minecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();

        // Function to get player permissions based on the unique prefix
        function getPlayerPermissions(prefix: string, player: Player): string | undefined {
            const permIds = player.getDynamicPropertyIds();
            return permIds.find((id) => id.startsWith(prefix));
        }

        // Function to get world permissions based on the unique prefix
        function getWorldPermissions(prefix: string, world: World): string | undefined {
            const permIds = world.getDynamicPropertyIds();
            return permIds.find((id) => id.startsWith(prefix));
        }

        // Retrieve permissions for the player and the world
        const prefix = `__`; // Unique prefix for permissions
        const playerPerms = getPlayerPermissions(prefix, message.sender);
        const worldPerms = getWorldPermissions(prefix, world);

        // Check if the player has permissions to execute the command
        if (!worldPerms || (worldPerms && playerPerms === worldPerms)) {
            message.sender.sendMessage("§o§7You have executed the OP command. Please close this window.");
        } else {
            // Not authorized
            message.sender.sendMessage("§o§7You do not have permissions.");
            return;
        }

        // Define a function to open the GUI
        const openOpGui = (message: ChatSendBeforeEvent, world: World) => {
            const player = message.sender;

            // Initialize the modal form data
            const opGui = minecraftEnvironment.initializeModalFormData();

            // Set title and text fields if the GUI is being initialized
            opGui.title("Paradox Op");
            opGui.textField("\nNew Password:", "Enter Password");
            opGui.textField("\nConfirm New Password:", "Enter Password");

            // Show the GUI
            opGui
                .show(player)
                .then((result) => {
                    // Check if the GUI was canceled due to user being busy
                    if (result && result.canceled && result.cancelationReason === "UserBusy") {
                        // Open GUI again
                        return openOpGui(message, world);
                    }

                    // Retrieve form values from the result or use an empty array as a fallback
                    const formValues = result?.formValues || [];

                    // Check if formValues is empty
                    if (formValues.length === 0) {
                        // Return if formValues is empty
                        return;
                    }

                    // Destructure formValues
                    const [newPassword, confirmPassword] = formValues;

                    // Unique prefix for permissions
                    const newPrefix = `__${player.id}`;
                    // Check if passwords match
                    if (newPassword !== confirmPassword) {
                        player.sendMessage("§o§7Please enter a new password again. Your confirmed password did not match!");
                    } else {
                        // Set player and world properties with the new password
                        player.setDynamicProperty(newPrefix, newPassword as string);
                        world.setDynamicProperty(newPrefix, newPassword as string);
                        player.sendMessage("§o§7Your password is set!");
                    }
                })
                .catch((error) => {
                    // Handle errors
                    console.error("Paradox Unhandled Rejection: ", error);
                    // Extract stack trace information
                    if (error instanceof Error) {
                        const stackLines = error.stack.split("\n");
                        if (stackLines.length > 1) {
                            const sourceInfo = stackLines;
                            console.error("Error originated from:", sourceInfo[0]);
                        }
                    }
                });
        };

        // Run the function to open the GUI within the Minecraft system
        system.run(() => {
            openOpGui(message, world);
        });
    },
};

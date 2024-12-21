import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, DynamicField } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { commandHandler } from "../../paradox";
import { ModalFormResponse } from "@minecraft/server-ui";
import CryptoES from "../../node_modules/crypto-es/lib/index";

/**
 * Represents an action in an ActionFormData form.
 */
interface Action {
    name: string;
    command: string[];
    description?: string;
    requiredFields?: string[];
    crypto?: boolean;
}

/**
 * Represents the GUI opening command.
 */
export const guiCommand: Command = {
    name: "gui",
    description: "Opens the main GUI for the player, filtered by their security clearance.",
    usage: "{prefix}gui",
    category: "Utility",
    examples: [`{prefix}gui`],
    securityClearance: 1,

    /**
     * Executes the GUI opening command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;

        // Use the existing method to get the player's security clearance
        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

        /**
         * Opens the main GUI for the player, filtering by their security clearance.
         * @param {Player} player - The player to show the menu to.
         * @param {number} playerClearance - The security clearance level of the player.
         */
        function openMainGui(player: Player, playerClearance: number) {
            const commands = commandHandler.getRegisteredCommands().filter((command) => command.name !== "gui"); // Remove guiCommand from the list

            const categories: { [key: string]: Command[] } = {};

            commands.forEach((command) => {
                const { category, securityClearance } = command;
                if (securityClearance <= playerClearance) {
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(command);
                }
            });

            const accessibleCategories = Object.entries(categories).map(([category, commands]) => ({ category, commands }));

            if (accessibleCategories.length === 0) {
                player.sendMessage("You do not have access to any commands.");
                return;
            }

            // Main menu with categories
            const actionFormData = minecraftEnvironment.initializeActionFormData();
            const mainMenu = actionFormData.title("Main Menu").body("Select a category:");

            accessibleCategories.forEach(({ category }) => {
                mainMenu.button(category.charAt(0).toUpperCase() + category.slice(1).toLowerCase());
            });

            mainMenu.show(player).then((response) => {
                if (response.canceled && response.cancelationReason === "UserBusy") {
                    return openMainGui(player, playerSecurityClearance);
                }
                if (!response.canceled) {
                    const selectedCategory = accessibleCategories[response.selection];
                    openCategoryMenu(player, selectedCategory.category, selectedCategory.commands);
                }
            });
        }

        /**
         * Opens the command menu for a specific category.
         * @param {Player} player - The player to show the menu to.
         * @param {string} categoryName - The selected category name.
         * @param {Command[]} commands - The available commands in the category.
         */
        function openCategoryMenu(player: Player, categoryName: string, commands: Command[]) {
            const actionFormData = minecraftEnvironment.initializeActionFormData();
            const form = actionFormData.title(`${categoryName} Commands`).body("Select a command:");

            commands.forEach((command) => {
                form.button(command.name.charAt(0).toUpperCase() + command.name.slice(1).toLowerCase());
            });

            // Add a "Back" button
            form.button("Back");

            form.show(player).then((response) => {
                if (!response.canceled) {
                    // Check if the last button ("Back") was selected
                    const backButtonIndex = commands.length; // The "Back" button is always the last one

                    // Handle "Back" button selection
                    if (response.selection === backButtonIndex) {
                        openMainGui(player, playerSecurityClearance);
                        return; // Exit early after handling "Back" button
                    }

                    // Handle selected command
                    const selectedCommand = commands[response.selection];
                    if (selectedCommand) {
                        buildCommandMenu(selectedCommand, player, minecraftEnvironment);
                    }
                }
            });
        }

        /**
         * Builds a form menu based on the provided GUI instructions.
         * @param {Command} command - The command object containing GUI instructions.
         * @param {Player} player - The player interacting with the form.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment object providing Minecraft-specific utilities.
         */
        function buildCommandMenu(command: Command, player: Player, minecraftEnvironment: MinecraftEnvironment) {
            const { guiInstructions } = command;

            if (!guiInstructions) {
                console.error("No GUI instructions found for command.");
                return;
            }

            const { formType, title, description, actions, dynamicFields, commandOrder } = guiInstructions;

            if (formType === "ActionFormData") {
                showActionForm(actions || [], title, description || "", player, command, minecraftEnvironment, dynamicFields || [], commandOrder);
            } else if (formType === "ModalFormData") {
                showModalForm(dynamicFields || [], title, player, command, minecraftEnvironment, [], false, commandOrder, []);
            }
        }

        /**
         * Displays an ActionFormData form with selectable actions.
         * @param {Action[]} actions - Array of actions to display in the form.
         * @param {string} title - The title of the form.
         * @param {string} description - The description displayed in the form.
         * @param {Player} player - The player interacting with the form.
         * @param {Command} command - The command object to execute based on selection.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment object for Minecraft utilities.
         * @param {DynamicField[]} dynamicFields - Array of dynamic fields associated with the actions.
         * @param {string | undefined} commandOrder - The order in which commands and arguments are constructed.
         */
        function showActionForm(actions: Action[], title: string, description: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, dynamicFields: DynamicField[], commandOrder?: string) {
            const actionForm = minecraftEnvironment.initializeActionFormData().title(title).body(description);

            actions.forEach((action) => {
                actionForm.button(action.name.charAt(0).toUpperCase() + action.name.slice(1).toLowerCase());
            });

            // Add a "Back" button
            actionForm.button("Back");

            actionForm
                .show(player)
                .then((response) => {
                    if (!response.canceled && response.selection !== undefined) {
                        // Check if the last button ("Back") was selected
                        const backButtonIndex = actions.length; // The "Back" button is always the last one
                        if (response.selection === backButtonIndex) {
                            // Handle "Back" button: Return to the previous menu.
                            openMainGui(player, playerSecurityClearance);
                        } else {
                            const selectedAction = actions[response.selection - 1]; // Adjust index for the "Back" button.
                            handleActionSelection(selectedAction, dynamicFields, title, player, command, minecraftEnvironment, commandOrder);
                        }
                    }
                })
                .catch((error) => console.error("Error showing action form:", error));
        }

        /**
         * Handles the selected action and executes associated commands.
         * @param {Action} action - The selected action object.
         * @param {DynamicField[]} dynamicFields - Array of dynamic fields related to the action.
         * @param {string} title - The title of the form.
         * @param {Player} player - The player interacting with the form.
         * @param {Command} command - The command object to execute.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment object for Minecraft utilities.
         * @param {string | undefined} commandOrder - The order in which commands and arguments are constructed.
         */
        function handleActionSelection(action: Action, dynamicFields: DynamicField[], title: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, commandOrder?: string) {
            const { requiredFields, command: commandArray, crypto } = action;

            if (!requiredFields || requiredFields.length === 0) {
                const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                command.execute(chatSendBeforeEvent, commandArray, minecraftEnvironment, crypto ? CryptoES : undefined);
            } else {
                const conditionalFields = dynamicFields.filter((field) => requiredFields.includes(field.name));
                showModalForm(conditionalFields, title, player, command, minecraftEnvironment, commandArray, crypto, commandOrder, requiredFields);
            }
        }

        /**
         * Displays a ModalFormData form to collect input from the player.
         * @param {DynamicField[]} dynamicFields - Array of dynamic fields to display in the form.
         * @param {string} title - The title of the form.
         * @param {Player} player - The player interacting with the form.
         * @param {Command} command - The command object to execute.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment object for Minecraft utilities.
         * @param {string[]} commandArray - Array of commands to execute based on input.
         * @param {boolean | undefined} cryptoES - Whether to use CryptoES for encryption.
         * @param {string | undefined} commandOrder - The order in which commands and arguments are constructed.
         * @param {string[]} requiredFields - The names of the fields required for command execution.
         */
        function showModalForm(dynamicFields: DynamicField[], title: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]) {
            const modalForm = minecraftEnvironment.initializeModalFormData().title(title);

            for (const field of dynamicFields) {
                switch (field.type) {
                    case "text":
                        modalForm.textField(field.placeholder || "", field.name);
                        break;
                    case "dropdown":
                        const allPlayers = world.getAllPlayers().map((player) => player.name);
                        field.options = allPlayers;
                        modalForm.dropdown(field.placeholder, field.options, -1);
                        break;
                    case "toggle":
                        modalForm.toggle(field.name, false);
                        break;
                }
            }

            modalForm
                .show(player)
                .then((response) => {
                    if (!response.canceled) {
                        const args = parseFormResponse(response, dynamicFields, commandArray, requiredFields);
                        const commandString = buildCommandString(commandOrder, commandArray, args);
                        const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                        command.execute(chatSendBeforeEvent, commandString, minecraftEnvironment, cryptoES ? CryptoES : undefined);
                    }
                })
                .catch((error) => console.error("Error showing modal form:", error));
        }

        /**
         * Builds the command string based on the specified command order.
         * @param {string | undefined} commandOrder - Determines the order in which the command and arguments are concatenated.
         * @param {string[]} selectedAction - The array of commands or actions to be executed.
         * @param {string[]} args - The array of arguments to be passed to the command.
         * @returns {string[]} - The constructed command string array.
         */
        function buildCommandString(commandOrder: string | undefined, selectedAction: string[] = [], args: string[] = []): string[] {
            /**
             * Splits each argument by spaces and flattens the resulting arrays.
             * @param {string[]} args - The array of arguments to split.
             * @returns {string[]} - A flattened array of split arguments.
             */
            const splitArgs = (args: string[]): string[] => args.flatMap((arg) => arg.split(" "));

            const splitArgsList = splitArgs(args);

            // Combine arguments and actions based on the specified command order.
            return commandOrder === "arg-command" ? [...splitArgsList, ...selectedAction] : [...selectedAction, ...splitArgsList];
        }

        /**
         * Parses user response into command arguments based on `DynamicField` definitions.
         * @param {ModalFormResponse} response - The response object from the modal form.
         * @param {DynamicField[]} fields - The array of dynamic fields used to construct the form.
         * @param {string[]} commandArray - The base array of commands to be executed.
         * @param {string[]} [requiredFields=[]] - The list of required field names for command execution.
         * @returns {string[]} - The array of parsed arguments constructed from the user's responses.
         */
        function parseFormResponse(response: ModalFormResponse, fields: DynamicField[], commandArray: string[], requiredFields: string[] = []): string[] {
            const args: string[] = [];
            let formIndex = 0;

            requiredFields.forEach((field, index) => {
                const dynamicField = fields.find((f) => f.name === field);
                let value = "";

                if (dynamicField) {
                    switch (dynamicField.type) {
                        case "text":
                            value = response.formValues[formIndex++] as string; // Text input value
                            break;

                        case "dropdown":
                            const selectedIndex = response.formValues[formIndex++] as number; // Dropdown selection index
                            value = dynamicField.options[selectedIndex]; // Selected option value
                            break;

                        case "toggle":
                            value = (response.formValues[formIndex++] as boolean) ? "true" : "false"; // Toggle value
                            break;
                    }
                }

                // Construct argument string by combining the defined argument name (if any) and the field value.
                const arg = dynamicField?.arg ?? commandArray?.[index] ?? "";
                args.push(`${arg} ${value}`);
            });

            return args;
        }

        // Open the main GUI for the player based on clearance level
        system.run(() => openMainGui(player, playerSecurityClearance));
    },
};

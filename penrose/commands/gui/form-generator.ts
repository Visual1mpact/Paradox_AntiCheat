import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, GuiInstructions, DynamicField, ActionFormButton } from "../../classes/command-handler";
import { commandHandler } from "../../event-listeners/world-initialize";
import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import CryptoES from "../../node_modules/crypto-es/lib/index";

/**
 * Represents the GUI opening command.
 * @type {Command}
 */
export const guiCommand: Command = {
    name: "gui",
    description: "Opens the main GUI for the player, filtered by their security clearance.",
    usage: "{prefix}gui",
    category: "Utility",
    examples: [`{prefix}gui`],
    securityClearance: 1,

    /**
     * Executes the command to open the main GUI for the player.
     * @param {ChatSendBeforeEvent} message - The event triggered when the command is executed.
     * @param {string[]} _ - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;
        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

        /**
         * Returns the icon path for a given category.
         * @param {string} category - The category name.
         * @returns {string} - The resource pack path of the icon for the category.
         */
        function getCategoryIconPath(category: string): string {
            const icons = {
                Moderation: "textures/items/diamond_sword.png",
                Utility: "textures/items/compass_item.png",
                Modules: "textures/ui/gear.png",
            };

            return icons[category as keyof typeof icons] || ""; // Default icon if category not found
        }

        /**
         * Opens the main GUI for the player, filtering by their security clearance.
         * @param {Player} player - The player executing the command.
         * @param {number} playerClearance - The security clearance level of the player.
         */
        function openMainGui(player: Player, playerClearance: number) {
            const commands = commandHandler.getRegisteredCommands().filter((command) => command.name !== "gui"); // Remove guiCommand
            const categories: { [key: string]: Command[] } = {};

            // Categorize commands based on security clearance and category
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
                player.sendMessage("§o§cYou do not have access to any commands.");
                return;
            }

            // Sort categories alphabetically
            accessibleCategories.sort((a, b) => a.category.localeCompare(b.category));

            const actionFormData = new ActionFormData();
            const mainMenu = actionFormData.title("Main Menu").body("Select a category:");

            // Add buttons for each accessible category in sorted order
            accessibleCategories.forEach(({ category }) => {
                // Get the icon path for the category
                const iconPath = getCategoryIconPath(category);
                mainMenu.button(category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(), iconPath);
            });

            mainMenu.show(player).then((response) => {
                if (!response.canceled) {
                    const selectedCategory = accessibleCategories[response.selection];
                    openCategoryMenu(player, selectedCategory.category, selectedCategory.commands);
                } else if (response.cancelationReason === "UserBusy") {
                    return openMainGui(player, playerSecurityClearance);
                }
            });
        }

        /**
         * Opens the command menu for a specific category.
         * @param {Player} player - The player executing the command.
         * @param {string} categoryName - The name of the category to display.
         * @param {Command[]} commands - The list of commands to display in this category.
         */
        function openCategoryMenu(player: Player, categoryName: string, commands: Command[]) {
            const actionFormData = new ActionFormData();
            const form = actionFormData.title(`${categoryName} Commands`).body("Select a command:");

            // Sort commands alphabetically
            commands.sort((a, b) => a.name.localeCompare(b.name));

            // Add buttons for each command in sorted order
            commands.forEach((command) => {
                form.button(command.name.charAt(0).toUpperCase() + command.name.slice(1).toLowerCase(), command.icon);
            });

            // Add "Back" button
            form.button("Back", "textures/ui/back_button_default.png");

            form.show(player).then((response) => {
                if (!response.canceled) {
                    const backButtonIndex = commands.length;
                    if (response.selection === backButtonIndex) {
                        openMainGui(player, playerSecurityClearance);
                    } else {
                        const selectedCommand = commands[response.selection];
                        buildCommandMenu(selectedCommand, player);
                    }
                }
            });
        }

        /**
         * Builds a form menu based on the provided GUI instructions.
         * @param {Command} command - The command whose instructions will be used to build the form.
         * @param {Player} player - The player executing the command.
         */
        function buildCommandMenu(command: Command, player: Player) {
            const { guiInstructions } = command;

            if (!guiInstructions) {
                console.error("No GUI instructions found for command.");
                return;
            }

            const { formType, title, description, actions, dynamicFields, commandOrder } = guiInstructions;

            const requiredFields = (actions?.map((action) => action.requiredFields ?? []) ?? []).flat(); // Safely map and handle undefined actions

            const finalRequiredFields = requiredFields.length > 0 ? requiredFields : [];

            if (formType === "ActionFormData") {
                showActionForm(actions ?? [], title, description ?? "", player, command, dynamicFields ?? [], commandOrder, guiInstructions);
            } else if (formType === "ModalFormData") {
                showModalForm(dynamicFields ?? [], title, player, command, [], false, commandOrder, finalRequiredFields);
            }
        }

        /**
         * Displays an ActionFormData form with selectable actions.
         * @param {Action[]} actions - The list of actions to display.
         * @param {string} title - The title of the form.
         * @param {string} description - The description of the form.
         * @param {Player} player - The player executing the command.
         * @param {Command} command - The command being executed.
         * @param {DynamicField[]} dynamicFields - The dynamic fields for the form.
         * @param {string} [commandOrder] - The order of command arguments.
         * @param {GuiInstructions} [guiInstructions] - The GUI instructions for the form.
         */
        function showActionForm(actions: ActionFormButton[], title: string, description: string, player: Player, command: Command, dynamicFields: DynamicField[], commandOrder?: string, guiInstructions?: GuiInstructions) {
            const actionForm = new ActionFormData().title(title).body(description);

            actions.forEach((action) => {
                const formattedName = action.name
                    .split(" ") // Split the string into words
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
                    .join(" "); // Join the words back into a single string
                actionForm.button(formattedName, action.icon);
            });

            // Add "Back" button
            actionForm.button("Back", "textures/ui/back_button_default.png");

            actionForm
                .show(player)
                .then((response) => {
                    if (!response.canceled) {
                        const backButtonIndex = actions.length;
                        if (response.selection === backButtonIndex) {
                            openMainGui(player, playerSecurityClearance);
                        } else {
                            const selectedAction = actions[response.selection];
                            if (selectedAction.generateSubActions) {
                                // Show nested action form for sub-actions
                                showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description, player, command, dynamicFields, commandOrder, guiInstructions);
                            } else {
                                const selectedAction = actions[response.selection];
                                handleActionSelection(selectedAction, dynamicFields, title, player, command, commandOrder);
                            }
                        }
                    }
                })
                .catch((error) => console.error("Error showing action form:", error));
        }

        /**
         * Handles the selected action and executes associated commands.
         * @param {ActionFormButton} action - The selected action to be executed.
         * @param {DynamicField[]} dynamicFields - The dynamic fields for the form.
         * @param {string} title - The title of the form.
         * @param {Player} player - The player executing the command.
         * @param {Command} command - The command being executed.
         * @param {string} [commandOrder] - The order of command arguments.
         */
        function handleActionSelection(action: ActionFormButton, dynamicFields: DynamicField[], title: string, player: Player, command: Command, commandOrder?: string) {
            const { requiredFields, command: commandArray, crypto } = action;

            if (action.generateModalForm) {
                const conditionalFields = dynamicFields.filter((field) => requiredFields.some((requiredField) => field.requiredFields.includes(requiredField)));
                showModalForm(conditionalFields, title, player, command, commandArray, crypto, commandOrder, requiredFields);
            } else {
                if (!requiredFields || requiredFields.length === 0) {
                    const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                    command.execute(chatSendBeforeEvent, commandArray, crypto ? CryptoES : undefined);
                }
            }
        }

        /**
         * Displays a ModalFormData form to collect input from the player.
         * @param {DynamicField[]} dynamicFields - The dynamic fields for the form.
         * @param {string} title - The title of the form.
         * @param {Player} player - The player executing the command.
         * @param {Command} command - The command being executed.
         * @param {string[]} commandArray - The list of command arguments.
         * @param {boolean} [cryptoES] - Flag to indicate encryption is needed.
         * @param {string} [commandOrder] - The order of command arguments.
         * @param {string[]} [requiredFields] - Required fields for the form.
         */
        function showModalForm(dynamicFields: DynamicField[], title: string, player: Player, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]) {
            const modalForm = new ModalFormData().title(title);

            for (const field of dynamicFields) {
                // Format placeholder if available
                const formattedPlaceholder = field.placeholder
                    ? field.placeholder
                          .split(" ")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(" ")
                    : "";

                // Format name if available
                const formattedName = field.name
                    ? field.name
                          .split(" ")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(" ")
                    : "";

                switch (field.type) {
                    case "text": {
                        modalForm.textField(formattedName, formattedPlaceholder);
                        break;
                    }
                    case "dropdown": {
                        if (field.sourceType === "players") {
                            const allPlayers = world.getAllPlayers().map((player) => player.name);
                            field.options = allPlayers;
                        } else {
                            const allEntities = world
                                .getDimension(player.dimension.id)
                                .getEntities({ excludeTypes: ["player"] })
                                .map((entity) => entity.typeId.replace("minecraft:", ""));

                            // Deduplicate entity type IDs
                            field.options = [...new Set(allEntities)];
                        }
                        modalForm.dropdown(formattedName, field.options ?? [""], -1);
                        break;
                    }
                    case "toggle": {
                        modalForm.toggle(formattedName, false);
                        break;
                    }
                }
            }

            modalForm
                .show(player)
                .then((response) => {
                    if (!response.canceled) {
                        const args = parseFormResponse(response, dynamicFields, requiredFields);
                        const commandString = buildCommandString(commandOrder, commandArray, args);
                        const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                        command.execute(chatSendBeforeEvent, commandString, cryptoES ? CryptoES : undefined);
                    }
                })
                .catch((error) => console.error("Error showing modal form:", error));
        }

        /**
         * Builds the command string based on the specified command order.
         * @param {string} commandOrder - The order of command arguments.
         * @param {string[]} selectedAction - The selected action arguments.
         * @param {string[]} args - The parsed command arguments.
         * @returns {string[]} The combined command string.
         */
        function buildCommandString(commandOrder: string | undefined, selectedAction: string[] = [], args: string[] = []): string[] {
            const splitArgs = (args: string[]): string[] => args.flatMap((arg) => arg.split(" "));

            const splitArgsList = splitArgs(args);
            return commandOrder === "arg-command" ? [...splitArgsList, ...selectedAction] : [...selectedAction, ...splitArgsList];
        }

        /**
         * Parses user response into command arguments based on `DynamicField` definitions.
         * @param {ModalFormResponse} response - The response from the modal form.
         * @param {DynamicField[]} fields - The dynamic fields for the form.
         * @param {string[]} requiredFields - The required fields for the command.
         * @returns {string[]} The parsed command arguments.
         */
        function parseFormResponse(response: ModalFormResponse, fields: DynamicField[], requiredFields: string[] = []): string[] {
            const args: string[] = [];
            let formIndex = 0;

            fields.forEach((dynamicField) => {
                if (!dynamicField.requiredFields || dynamicField.requiredFields.some((field) => requiredFields.includes(field))) {
                    let value = "";
                    switch (dynamicField.type) {
                        case "text": {
                            value = response.formValues[formIndex++] as string;
                            if (dynamicField.arg) {
                                args.push(dynamicField.arg);
                            }
                            break;
                        }
                        case "dropdown": {
                            const selectedIndex = response.formValues[formIndex++] as number;
                            value = dynamicField.options[selectedIndex];
                            if (dynamicField.arg) {
                                args.push(dynamicField.arg);
                            }
                            break;
                        }
                        case "toggle": {
                            const toggleValue = response.formValues[formIndex++];
                            if (dynamicField.arg) {
                                if (toggleValue === true) {
                                    args.push(dynamicField.arg);
                                }
                            }
                            return; // Early exit toggle, don't continue below
                        }
                    }

                    // Text and Dropdown fields continue here:
                    if (value) {
                        args.push(value.trim());
                    }
                }
            });

            return args;
        }

        player.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to view the GUI.");

        // Open the main GUI for the player based on clearance level
        system.run(() => openMainGui(player, playerSecurityClearance));
    },
};

import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, GuiInstructions, DynamicField, ActionFormButton } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { commandHandler } from "../../paradox";
import { ModalFormResponse } from "@minecraft/server-ui";
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
     * @param {MinecraftEnvironment} minecraftEnvironment - The environment used to initialize forms and commands.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

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
                player.sendMessage("You do not have access to any commands.");
                return;
            }

            const actionFormData = minecraftEnvironment.initializeActionFormData();
            const mainMenu = actionFormData.title("Main Menu").body("Select a category:");

            // Add buttons for each accessible category
            accessibleCategories.forEach(({ category }) => {
                mainMenu.button(category.charAt(0).toUpperCase() + category.slice(1).toLowerCase());
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
            const actionFormData = minecraftEnvironment.initializeActionFormData();
            const form = actionFormData.title(`${categoryName} Commands`).body("Select a command:");

            // Add buttons for each command
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
                        buildCommandMenu(selectedCommand, player, minecraftEnvironment);
                    }
                }
            });
        }

        /**
         * Builds a form menu based on the provided GUI instructions.
         * @param {Command} command - The command whose instructions will be used to build the form.
         * @param {Player} player - The player executing the command.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment used to initialize forms and commands.
         */
        function buildCommandMenu(command: Command, player: Player, minecraftEnvironment: MinecraftEnvironment) {
            const { guiInstructions } = command;

            if (!guiInstructions) {
                console.error("No GUI instructions found for command.");
                return;
            }

            const { formType, title, description, actions, dynamicFields, commandOrder } = guiInstructions;

            const requiredFields = (actions as ActionFormButton[]).map((action) => action.requiredFields ?? []).flat(); // Flatten requiredFields

            const finalRequiredFields = requiredFields.length > 0 ? requiredFields : [];

            if (formType === "ActionFormData") {
                showActionForm(actions ?? [], title, description ?? "", player, command, minecraftEnvironment, dynamicFields ?? [], commandOrder, guiInstructions);
            } else if (formType === "ModalFormData") {
                showModalForm(dynamicFields ?? [], title, player, command, minecraftEnvironment, [], false, commandOrder, finalRequiredFields, guiInstructions);
            }
        }

        /**
         * Displays an ActionFormData form with selectable actions.
         * @param {Action[]} actions - The list of actions to display.
         * @param {string} title - The title of the form.
         * @param {string} description - The description of the form.
         * @param {Player} player - The player executing the command.
         * @param {Command} command - The command being executed.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment used to initialize forms and commands.
         * @param {DynamicField[]} dynamicFields - The dynamic fields for the form.
         * @param {string} [commandOrder] - The order of command arguments.
         * @param {GuiInstructions} [guiInstructions] - The GUI instructions for the form.
         */
        function showActionForm(
            actions: ActionFormButton[],
            title: string,
            description: string,
            player: Player,
            command: Command,
            minecraftEnvironment: MinecraftEnvironment,
            dynamicFields: DynamicField[],
            commandOrder?: string,
            guiInstructions?: GuiInstructions
        ) {
            const actionForm = minecraftEnvironment.initializeActionFormData().title(title).body(description);

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
                                showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description, player, command, minecraftEnvironment, dynamicFields, commandOrder, guiInstructions);
                            } else {
                                const selectedAction = actions[response.selection];
                                handleActionSelection(selectedAction, dynamicFields, title, player, command, minecraftEnvironment, commandOrder, guiInstructions);
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
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment used to initialize forms and commands.
         * @param {string} [commandOrder] - The order of command arguments.
         * @param {GuiInstructions} [guiInstructions] - The GUI instructions for the form.
         */
        function handleActionSelection(action: ActionFormButton, dynamicFields: DynamicField[], title: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, commandOrder?: string, guiInstructions?: GuiInstructions) {
            const { requiredFields, command: commandArray, crypto } = action;

            if (action.generateModalForm) {
                const conditionalFields = dynamicFields.filter((field) => requiredFields.some((requiredField) => field.requiredFields.includes(requiredField)));
                showModalForm(conditionalFields, title, player, command, minecraftEnvironment, commandArray, crypto, commandOrder, requiredFields, guiInstructions);
            } else {
                if (!requiredFields || requiredFields.length === 0) {
                    const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                    command.execute(chatSendBeforeEvent, commandArray, minecraftEnvironment, crypto ? CryptoES : undefined);
                }
            }
        }

        /**
         * Displays a ModalFormData form to collect input from the player.
         * @param {DynamicField[]} dynamicFields - The dynamic fields for the form.
         * @param {string} title - The title of the form.
         * @param {Player} player - The player executing the command.
         * @param {Command} command - The command being executed.
         * @param {MinecraftEnvironment} minecraftEnvironment - The environment used to initialize forms and commands.
         * @param {string[]} commandArray - The list of command arguments.
         * @param {boolean} [cryptoES] - Flag to indicate encryption is needed.
         * @param {string} [commandOrder] - The order of command arguments.
         * @param {string[]} [requiredFields] - Required fields for the form.
         * @param {GuiInstructions} [guiInstructions] - The GUI instructions for the form.
         */
        function showModalForm(
            dynamicFields: DynamicField[],
            title: string,
            player: Player,
            command: Command,
            minecraftEnvironment: MinecraftEnvironment,
            commandArray: string[],
            cryptoES?: boolean,
            commandOrder?: string,
            requiredFields?: string[],
            guiInstructions?: GuiInstructions
        ) {
            const modalForm = minecraftEnvironment.initializeModalFormData().title(title);

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
                        const allPlayers = world.getAllPlayers().map((player) => player.name);
                        field.options = allPlayers;
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
                        const args = parseFormResponse(response, dynamicFields, commandArray, requiredFields, guiInstructions);
                        const commandString = buildCommandString(commandOrder, commandArray, args);
                        const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                        command.execute(chatSendBeforeEvent, commandString, minecraftEnvironment, cryptoES ? CryptoES : undefined);
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
         * @param {string[]} commandArray - The list of command arguments.
         * @param {string[]} requiredFields - The required fields for the command.
         * @param {GuiInstructions} guiInstructions - The GUI instructions for the form.
         * @returns {string[]} The parsed command arguments.
         */
        function parseFormResponse(response: ModalFormResponse, fields: DynamicField[], commandArray: string[], requiredFields: string[] = [], guiInstructions: GuiInstructions): string[] {
            const args: string[] = [];
            let formIndex = 0;

            fields.forEach((dynamicField) => {
                if (dynamicField.requiredFields.some((field) => requiredFields.includes(field))) {
                    let value = "";
                    switch (dynamicField.type) {
                        case "text": {
                            // Directly access the corresponding text field value by formIndex
                            value = response.formValues[formIndex++] as string;
                            break;
                        }
                        case "dropdown": {
                            const selectedIndex = response.formValues[formIndex++] as number;
                            value = dynamicField.options[selectedIndex];
                            break;
                        }
                        case "toggle": {
                            // Skip the toggle field if action is generating modal form and command is undefined
                            const isActionWithNoCommand = guiInstructions.actions.some((action) => action.command === undefined && action.generateModalForm === true);
                            if (isActionWithNoCommand) {
                                // Skip adding toggle argument if the action is supposed to generate a modal form
                                formIndex++; // Increment formIndex to prevent incorrect indexing
                            } else {
                                // If the command is not undefined, process the toggle normally
                                value = response.formValues[formIndex++] ? "true" : "false"; // Toggle value
                            }
                            break;
                        }
                    }
                    args.push(`${dynamicField?.arg ?? (commandArray ? commandArray[formIndex - 1] : "")} ${value}`.trim());
                }
            });

            return args;
        }

        // Open the main GUI for the player based on clearance level
        system.run(() => openMainGui(player, playerSecurityClearance));
    },
};

import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, DynamicField, ActionFormButton } from "../../classes/command-handler";
import { commandHandler } from "../../event-listeners/world-initialize";
import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import * as CryptoESImport from "../../node_modules/crypto-es";

const CryptoES = (CryptoESImport as any).default ?? CryptoESImport;

/**
 * Command that opens the main GUI for the player, filtered by their security clearance.
 */
export const guiCommand: Command = {
    name: "gui",
    description: "Opens the main GUI for the player, filtered by their security clearance.",
    usage: "{prefix}gui",
    category: "Utility",
    examples: ["{prefix}gui"],
    securityClearance: 1,

    /**
     * Executes the GUI command when invoked by a player.
     * @param message The chat event that triggered the command.
     * @param _ Unused arguments.
     */
    execute: (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;
        const playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

        /**
         * Returns the texture path for a given category.
         * @param category The command category name.
         * @returns The texture path for the category's icon.
         */
        function getCategoryIconPath(category: string): string {
            const icons = {
                Moderation: "textures/items/diamond_sword.png",
                Utility: "textures/items/compass_item.png",
                Modules: "textures/ui/gear.png",
            };
            return icons[category as keyof typeof icons] || "";
        }

        /**
         * Displays the main GUI to the player, showing categories they have access to.
         * @param player The player to show the GUI to.
         * @param playerClearance The player's security clearance level.
         */
        function openMainGui(player: Player, playerClearance: number) {
            const commands = commandHandler.getRegisteredCommands().filter((cmd) => cmd.name !== "gui");
            const categories: Record<string, Command[]> = {};

            for (const cmd of commands) {
                if (cmd.securityClearance <= playerClearance) {
                    categories[cmd.category] ??= [];
                    categories[cmd.category].push(cmd);
                }
            }

            const accessibleCategories = Object.entries(categories)
                .map(([category, cmds]) => ({ category, commands: cmds }))
                .sort((a, b) => a.category.localeCompare(b.category));

            if (accessibleCategories.length === 0) {
                player.sendMessage("§o§c[Paradox] You do not have access to any commands.");
                return;
            }

            const form = new ActionFormData().title("Main Menu").body("Select a category:");
            for (const { category } of accessibleCategories) {
                form.button(category, getCategoryIconPath(category));
            }

            form.show(player).then((res) => {
                if (res.canceled && res.cancelationReason === "UserBusy") return openMainGui(player, playerClearance);
                if (!res.canceled) openCategoryMenu(player, accessibleCategories[res.selection].category, accessibleCategories[res.selection].commands);
            });
        }

        /**
         * Displays a submenu of commands for a specific category.
         * @param player The player to show the GUI to.
         * @param categoryName The name of the category.
         * @param commands The list of commands in that category.
         */
        function openCategoryMenu(player: Player, categoryName: string, commands: Command[]) {
            const form = new ActionFormData().title(`${categoryName} Commands`).body("Select a command:");

            commands.sort((a, b) => a.name.localeCompare(b.name));
            for (const cmd of commands) form.button(cmd.name, cmd.icon);
            form.button("Back", "textures/ui/back_button_default.png");

            form.show(player).then((res) => {
                if (res.canceled) return;
                if (res.selection === commands.length) return openMainGui(player, playerSecurityClearance);
                buildCommandMenu(commands[res.selection], player);
            });
        }

        /**
         * Builds and displays the GUI form for a specific command.
         * @param command The command object containing GUI instructions.
         * @param player The player to show the GUI to.
         */
        function buildCommandMenu(command: Command, player: Player) {
            const gui = command.guiInstructions;
            if (!gui) return console.error("[Paradox] No GUI instructions found for command.");

            const { formType, title, description = "", actions = [], dynamicFields = [], commandOrder } = gui;
            const requiredFields = actions.flatMap((a) => a.requiredFields ?? []);
            const staticCommands = actions.flatMap((a) => a.command ?? []);

            if (formType === "ActionFormData") {
                showActionForm(actions, title, description, player, command, dynamicFields, commandOrder);
            } else if (formType === "ModalFormData") {
                showModalForm(dynamicFields, title, player, command, staticCommands, false, commandOrder, requiredFields);
            }
        }

        /**
         * Displays an ActionFormData form with a list of command actions.
         * @param actions List of action buttons to display.
         * @param title The form title.
         * @param description The form description.
         * @param player The player to show the GUI to.
         * @param command The command to execute on action.
         * @param dynamicFields The dynamic fields related to this command.
         * @param commandOrder The order in which command arguments should be concatenated.
         */
        function showActionForm(actions: ActionFormButton[], title: string, description: string, player: Player, command: Command, dynamicFields: DynamicField[], commandOrder?: string) {
            const form = new ActionFormData().title(title).body(description);

            for (const action of actions) {
                form.button(action.name, action.icon);
            }
            form.button("Back", "textures/ui/back_button_default.png");

            form.show(player)
                .then((res) => {
                    if (res.canceled) return;
                    if (res.selection === actions.length) return openMainGui(player, playerSecurityClearance);
                    const selectedAction = actions[res.selection];

                    if (selectedAction.generateSubActions && selectedAction.subActions?.length) {
                        showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description ?? "", player, command, dynamicFields, commandOrder);
                    } else {
                        handleActionSelection(selectedAction, dynamicFields, title, player, command, commandOrder);
                    }
                })
                .catch(console.error);
        }

        /**
         * Handles the selection of an action button.
         * @param action The selected action.
         * @param dynamicFields Dynamic fields related to this action.
         * @param title The form title.
         * @param player The player executing the command.
         * @param command The command associated with the action.
         * @param commandOrder Order in which to concatenate arguments.
         */
        function handleActionSelection(action: ActionFormButton, dynamicFields: DynamicField[], title: string, player: Player, command: Command, commandOrder?: string) {
            const { requiredFields = [], crypto } = action;

            if (requiredFields.length > 0) {
                const fields = dynamicFields.filter((f) => requiredFields.some((rf) => f.requiredFields?.includes(rf)));
                showModalForm(fields, title, player, command, action.command ?? [], crypto, commandOrder, requiredFields);
            } else {
                const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                const staticCommand = action.command ?? [];
                command.execute(chatSendBeforeEvent, staticCommand, crypto ? CryptoES : undefined);
            }
        }

        /**
         * Displays a ModalFormData with input fields.
         * @param fields The list of fields to show.
         * @param title The title of the form.
         * @param player The player to show the form to.
         * @param command The command to execute after input.
         * @param commandArray Static command parts to include.
         * @param cryptoES Whether to use CryptoES for the command.
         * @param commandOrder How to concatenate arguments.
         * @param requiredFields Required field identifiers.
         */
        function showModalForm(fields: DynamicField[], title: string, player: Player, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]) {
            const form = new ModalFormData().title(title);

            for (const field of fields) {
                const name = field.name || "";
                const placeholder = field.placeholder || "";
                const formattedName = name
                    .split(" ")
                    .map((w) => w[0].toUpperCase() + w.slice(1))
                    .join(" ");
                const formattedPlaceholder = (placeholder ?? "")
                    .split(" ")
                    .map((w) => w[0]?.toUpperCase() + w.slice(1))
                    .join(" ");

                switch (field.type) {
                    case "text":
                        form.textField(formattedName, formattedPlaceholder);
                        break;
                    case "dropdown":
                        if (field.sourceType === "players") {
                            field.options = world.getAllPlayers().map((p) => p.name);
                        } else if (field.sourceType === "entities") {
                            field.options = [
                                ...new Set(
                                    world
                                        .getDimension(player.dimension.id)
                                        .getEntities({ excludeTypes: ["player"] })
                                        .map((e) => e.typeId.replace("minecraft:", ""))
                                ),
                            ];
                        }
                        form.dropdown(formattedName, field.options ?? [""], { defaultValueIndex: 0 });
                        break;
                    case "toggle":
                        form.toggle(formattedName, { defaultValue: false });
                        break;
                }
            }

            form.show(player)
                .then((response) => {
                    if (response.canceled) return;
                    const args = parseFormResponse(response, fields, requiredFields);
                    const commandString = buildCommandString(commandOrder, commandArray, args);
                    const chatSendBeforeEvent = { cancel: false, message: "", sender: player };
                    command.execute(chatSendBeforeEvent, commandString, cryptoES ? CryptoES : undefined);
                })
                .catch(console.error);
        }

        /**
         * Combines static and dynamic arguments into the final command string array.
         * @param order The order in which to merge arguments.
         * @param staticArgs Arguments that are static and always included.
         * @param dynamicArgs Arguments generated from user input.
         * @returns An array of command arguments.
         */
        function buildCommandString(order: string | undefined, staticArgs: string[] = [], dynamicArgs: string[] = []): string[] {
            const flatten = (arr: string[]) => arr.flatMap((s) => s.trim().split(/\s+/)).filter(Boolean);
            return order === "arg-command" ? [...flatten(dynamicArgs), ...flatten(staticArgs)] : [...flatten(staticArgs), ...flatten(dynamicArgs)];
        }

        /**
         * Parses the form response into an array of command arguments.
         * @param response The response from the modal form.
         * @param fields The dynamic fields used in the form.
         * @param requiredFields List of required field names.
         * @returns An array of parsed arguments.
         */
        function parseFormResponse(response: ModalFormResponse, fields: DynamicField[], requiredFields: string[] = []): string[] {
            const args: string[] = [];
            let index = 0;
            const groupedValues: Record<string, string[]> = {};

            for (const field of fields) {
                if (!field.requiredFields || field.requiredFields.some((rf) => requiredFields.includes(rf))) {
                    let value: string = "";
                    switch (field.type) {
                        case "text":
                            value = (response.formValues[index++] as string)?.trim() ?? "0";
                            break;
                        case "dropdown":
                            const selectedIndex = response.formValues[index++] as number;
                            value = field.options?.[selectedIndex]?.trim() ?? "0";
                            break;
                        case "toggle":
                            const toggle = response.formValues[index++] as boolean;
                            if (field.arg && toggle) args.push(field.arg);
                            continue;
                    }

                    if (field.arg) {
                        if (!groupedValues[field.arg]) groupedValues[field.arg] = [];
                        groupedValues[field.arg].push(value || "0");
                    } else {
                        args.push(value || "0");
                    }
                }
            }

            for (const [arg, values] of Object.entries(groupedValues)) {
                args.push(arg, ...values);
            }

            return args;
        }

        player.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to view the GUI.");
        system.run(() => openMainGui(player, playerSecurityClearance));
    },
};

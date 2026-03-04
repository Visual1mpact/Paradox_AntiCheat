import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, DynamicField, ActionFormButton } from "../../classes/command-handler";
import { commandHandler } from "../../event-listeners/world-initialize";
import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import * as CryptoESImport from "../../node_modules/crypto-es";

// Import CryptoES library for optional encryption of commands
const CryptoES = (CryptoESImport as any).default ?? CryptoESImport;

/**
 * GUIManager handles all GUI interactions for a player, including:
 * - Main menu
 * - Category menus
 * - Action forms
 * - Modal forms with dynamic fields
 * - Executing commands based on player input
 */
class GUIManager {
    private player: Player; // The player viewing the GUI
    private playerSecurityClearance: number; // Security clearance level of the player

    constructor(player: Player) {
        this.player = player;
        // Retrieve the player's security clearance or default to 0
        this.playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;
    }

    /**
     * Returns the texture path for a category icon.
     * @param category Category name (e.g., "Moderation", "Utility", "Modules")
     */
    private getCategoryIconPath(category: string): string {
        const icons: Record<string, string> = {
            Moderation: "textures/items/diamond_sword.png",
            Utility: "textures/items/compass_item.png",
            Modules: "textures/ui/gear.png",
        };
        return icons[category] ?? "";
    }

    /**
     * Opens the main GUI menu showing accessible categories for the player.
     */
    public async openMainGui(): Promise<void> {
        // Get all registered commands except "gui" itself
        const commands = commandHandler.getRegisteredCommands().filter((cmd) => cmd.name !== "gui");

        // Group commands by category and filter by player clearance
        const categories: Record<string, Command[]> = {};
        for (const cmd of commands) {
            if (cmd.securityClearance <= this.playerSecurityClearance) {
                categories[cmd.category] ??= [];
                categories[cmd.category].push(cmd);
            }
        }

        // Convert object to sorted array of categories with commands
        const accessibleCategories = Object.entries(categories)
            .map(([category, cmds]) => ({ category, commands: cmds }))
            .sort((a, b) => a.category.localeCompare(b.category));

        // If no categories are accessible, inform the player
        if (accessibleCategories.length === 0) {
            this.player.sendMessage("§o§c[Paradox] You do not have access to any commands.");
            return;
        }

        // Build the ActionFormData GUI
        const form = new ActionFormData().title("Main Menu").body("Select a category:");
        for (const { category } of accessibleCategories) {
            form.button(category, this.getCategoryIconPath(category));
        }

        try {
            const res = await form.show(this.player);
            // If user canceled due to being busy, reopen the main menu
            if (res.canceled && res.cancelationReason === "UserBusy") {
                return this.openMainGui();
            }
            if (!res.canceled) {
                const selected = accessibleCategories[res.selection || 0];
                // Open the category menu for the selected category
                await this.openCategoryMenu(selected.category, selected.commands);
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Opens a menu showing all commands within a category.
     * @param categoryName Name of the category
     * @param commands Array of Command objects in the category
     */
    private async openCategoryMenu(categoryName: string, commands: Command[]): Promise<void> {
        const form = new ActionFormData().title(`${categoryName} Commands`).body("Select a command:");
        commands.sort((a, b) => a.name.localeCompare(b.name));

        // Add a button for each command and a "Back" button
        for (const cmd of commands) form.button(cmd.name, cmd.icon);
        form.button("Back", "textures/ui/back_button_default.png");

        try {
            const res = await form.show(this.player);
            if (res.canceled) return;
            // If "Back" is selected, return to main menu
            if (res.selection === commands.length) return this.openMainGui();

            const selectedCommand = commands[res.selection || 0];
            // Open the command-specific menu (action or modal)
            await this.buildCommandMenu(selectedCommand);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Builds and shows the GUI form for a specific command.
     * Determines whether to show an ActionFormData or ModalFormData.
     */
    private async buildCommandMenu(command: Command): Promise<void> {
        const gui = command.guiInstructions;
        if (!gui) return console.error("[Paradox] No GUI instructions found for command.");

        const { formType, title, description = "", actions = [], dynamicFields = [], commandOrder } = gui;

        if (formType === "ActionFormData") {
            await this.showActionForm(actions, title, description, command, dynamicFields, commandOrder);
        } else if (formType === "ModalFormData") {
            await this.showModalForm(
                dynamicFields,
                title,
                command,
                actions.flatMap((a) => a.command ?? []),
                false,
                commandOrder,
                actions.flatMap((a) => a.requiredFields ?? [])
            );
        }
    }

    /**
     * Displays an ActionFormData form for a set of command actions.
     */
    private async showActionForm(actions: ActionFormButton[], title: string, description: string, command: Command, dynamicFields: DynamicField[], commandOrder?: string): Promise<void> {
        const form = new ActionFormData().title(title).body(description);

        // Add buttons for each action and a "Back" button
        for (const action of actions) form.button(action.name, action.icon);
        form.button("Back", "textures/ui/back_button_default.png");

        try {
            const res = await form.show(this.player);
            if (res.canceled) return;
            // "Back" selected
            if (res.selection === actions.length) return this.openMainGui();

            const selectedAction = actions[res.selection || 0];
            // If action generates sub-actions, show them recursively
            if (selectedAction.generateSubActions && selectedAction.subActions?.length) {
                await this.showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description ?? "", command, dynamicFields, commandOrder);
            } else {
                // Handle executing the selected action
                await this.handleActionSelection(selectedAction, dynamicFields, title, command, commandOrder);
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Handles a selected action button, deciding if a modal form is required
     * or if the command can be executed directly.
     */
    private async handleActionSelection(action: ActionFormButton, dynamicFields: DynamicField[], title: string, command: Command, commandOrder?: string): Promise<void> {
        const { requiredFields = [], crypto } = action;

        if (requiredFields.length > 0) {
            // Filter dynamic fields that are required for this action
            const fields = dynamicFields.filter((f) => requiredFields.some((rf) => f.requiredFields?.includes(rf)));
            await this.showModalForm(fields, title, command, action.command ?? [], crypto, commandOrder, requiredFields);
        } else {
            // Execute static command directly
            const chatSendBeforeEvent = { cancel: false, message: "", sender: this.player };
            command.execute(chatSendBeforeEvent, action.command ?? [], crypto ? CryptoES : undefined);
        }
    }

    /**
     * Shows a ModalFormData form to collect dynamic input from the player.
     */
    private async showModalForm(fields: DynamicField[], title: string, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]): Promise<void> {
        const form = new ModalFormData().title(title);

        // Build form fields dynamically
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
                    // Populate dropdown dynamically for players or entities
                    if (field.sourceType === "players") {
                        field.options = world.getAllPlayers().map((p) => p.name);
                    } else if (field.sourceType === "entities") {
                        field.options = [
                            ...new Set(
                                world
                                    .getDimension(this.player.dimension.id)
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

        try {
            const response = await form.show(this.player);
            if (response.canceled) return;

            // Parse response into command arguments
            const args = this.parseFormResponse(response, fields, requiredFields);
            const finalCommand = this.buildCommandString(commandOrder, commandArray, args);

            const chatSendBeforeEvent = { cancel: false, message: "", sender: this.player };
            // Execute the command with optional encryption
            command.execute(chatSendBeforeEvent, finalCommand, cryptoES ? CryptoES : undefined);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Parses the player's input from a modal form into an array of command arguments.
     */
    private parseFormResponse(response?: ModalFormResponse, fields: DynamicField[] = [], requiredFields: string[] = []): string[] {
        if (!response?.formValues) return []; // early exit if no values

        const args: string[] = [];
        let index = 0;
        const groupedValues: Record<string, string[]> = {};

        for (const field of fields) {
            if (!field.requiredFields || field.requiredFields.some((rf) => requiredFields.includes(rf))) {
                let value: string | undefined;
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
                    groupedValues[field.arg] ??= [];
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

    /**
     * Combines static and dynamic command arguments based on order preference.
     */
    private buildCommandString(order: string | undefined, staticArgs: string[] = [], dynamicArgs: string[] = []): string[] {
        const flatten = (arr: string[]) => arr.flatMap((s) => s.trim().split(/\s+/)).filter(Boolean);
        return order === "arg-command" ? [...flatten(dynamicArgs), ...flatten(staticArgs)] : [...flatten(staticArgs), ...flatten(dynamicArgs)];
    }
}

/**
 * Command registration for opening the main GUI.
 */
export const guiCommand: Command = {
    name: "gui",
    description: "Opens the main GUI for the player, filtered by their security clearance.",
    usage: "{prefix}gui",
    category: "Utility",
    examples: ["{prefix}gui"],
    securityClearance: 1,

    execute: (message?: ChatSendBeforeEvent, _: string[] = []) => {
        if (!message) return;
        const player = message.sender;
        // Inform the player to close chat for the GUI
        player.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to view the GUI.");
        // Schedule GUI opening asynchronously
        system.run(() => new GUIManager(player).openMainGui());
    },
};

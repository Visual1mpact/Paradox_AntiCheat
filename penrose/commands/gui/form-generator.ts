import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, DynamicField, ActionFormButton } from "../../classes/core/command-handler";
import { chestLockDB, commandHandler, homesDB, waypointsDB } from "../../event-listeners/world-initialize";
import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import * as CryptoES from "../../node_modules/crypto-es";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";
import { LandClaimManager } from "../utility/land-claim";

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
     * Helper to safely handle form errors (ignoring player quit/rejection errors).
     */
    private handleFormError(err: unknown): void {
        const errorMsg = String(err);
        if (errorMsg.includes("Player quit before responding") || errorMsg.includes("FormRejectError")) {
            return; // Gracefully ignore player disconnects while UI is open
        }
        console.error("[Paradox] GUI Error:", err);
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
                categories[cmd.category]!.push(cmd);
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
                if (!selected) return;
                // Open the category menu for the selected category
                await this.openCategoryMenu(selected.category, selected.commands);
            }
        } catch (err) {
            this.handleFormError(err);
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

            const selectedCommand = commands[res.selection ?? 0];
            if (!selectedCommand) return;
            // Open the command-specific menu (action or modal)
            await this.buildCommandMenu(selectedCommand);
        } catch (err) {
            this.handleFormError(err);
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
        // Filter actions so the player only sees allowed buttons
        actions = commandHandler.filterButtonsBySecurity(actions, this.playerSecurityClearance);

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
            if (!selectedAction) return;
            // If action generates sub-actions, show them recursively
            if (selectedAction.generateSubActions && selectedAction.subActions?.length) {
                await this.showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description ?? "", command, dynamicFields, commandOrder);
            } else {
                // Handle executing the selected action
                await this.handleActionSelection(selectedAction, dynamicFields, title, command, commandOrder);
            }
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Handles a selected action button, deciding if a modal form is required
     * or if the command can be executed directly.
     */
    private async handleActionSelection(action: ActionFormButton, dynamicFields: DynamicField[], title: string, command: Command, commandOrder?: string): Promise<void> {
        const { requiredFields = [], crypto } = action;

        // EARLY GUARD
        if (requiredFields.includes("chestKey")) {
            const hasChests = chestLockDB.listPointers().length > 0;

            if (!hasChests) {
                this.player.sendMessage("§2[§7Paradox§2]§o§7 No locked chests exist yet.");
                return;
            }
        }

        if (requiredFields.length > 0) {
            const fields = dynamicFields.filter((f) => requiredFields.some((rf) => f.requiredFields?.includes(rf)));

            await this.showModalForm(fields, title, command, action.command ?? [], crypto, commandOrder, requiredFields);
        } else {
            const chatSendBeforeEvent = {
                cancel: false,
                message: "",
                sender: this.player,
            };

            command.execute(chatSendBeforeEvent, action.command ?? [], crypto ? CryptoES : undefined);
        }
    }

    /**
     * Resolves the string array options for a dynamic dropdown based on its sourceType.
     * @param {DynamicField} field - Target dropdown field configuration.
     * @returns {Promise<string[]>} Resolved dropdown options.
     */
    private async resolveDropdownOptions(field: DynamicField): Promise<string[]> {
        if (field.sourceType === "players") {
            return [...PlayerCache.getPlayerNames()];
        }
        if (field.sourceType === "entities") {
            const transform = PlayerLocationCache.getTransform(this.player);
            const dimension = transform?.dimension ?? world.getDimension(this.player.dimension.id);
            return [...new Set(dimension.getEntities({ excludeTypes: ["player"] }).map((e) => e.typeId.replace("minecraft:", "")))];
        }
        if (field.sourceType === "chests") {
            return [...chestLockDB.listPointers()].map((ptr) => {
                const key = ptr.split("/").pop() ?? "";
                return key.replace(/^minecraft:/, "");
            });
        }
        if (field.sourceType === "playerWaypoints") {
            const dbEntry = (await waypointsDB.get(this.player.id)) as { savedWaypoints?: Record<string, unknown> } | undefined;
            const options = Object.keys(dbEntry?.savedWaypoints ?? {});
            return options.length > 0 ? options : ["No Waypoints Saved"];
        }
        if (field.sourceType === "playerHomes") {
            const dbEntry = await homesDB.get(this.player.id);
            const locations = dbEntry?.locations ?? [];
            const obfuscatedKey = CryptoES.SHA256(this.player.id).toString();
            const options = locations.map((enc) => {
                try {
                    const bytes = CryptoES.AES.decrypt(enc, obfuscatedKey);
                    const decrypted = bytes.toString(CryptoES.Utf8);
                    return decrypted.split(":")[1] ?? "Unknown";
                } catch {
                    return "Corrupted Data";
                }
            });
            return options.length > 0 ? options : ["No Homes Saved"];
        }
        if (field.sourceType === "custom" && field.requiredFields?.includes("claimId")) {
            const userClaims = LandClaimManager.getInstance().getClaimsByOwner(this.player.id);
            const options = userClaims.map((claim) => claim.id);
            return options.length > 0 ? options : ["No Claims Found"];
        }
        return field.options ?? [""];
    }

    /**
     * Formats plain field strings to Title Case display values.
     * @param {string} value - String value to format.
     * @returns {string} Formatted Title Case string.
     */
    private formatFieldString(value?: string): string {
        return (value ?? "")
            .split(" ")
            .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""))
            .join(" ");
    }

    /**
     * Renders an individual dynamic field element into the ModalFormData instance.
     * @param {ModalFormData} form - Target modal form instance.
     * @param {DynamicField} field - Dynamic field definition.
     */
    private async renderFormField(form: ModalFormData, field: DynamicField): Promise<void> {
        const formattedName = this.formatFieldString(field.name);
        const formattedPlaceholder = this.formatFieldString(field.placeholder);

        switch (field.type) {
            case "text":
                form.textField(formattedName, formattedPlaceholder);
                break;
            case "dropdown": {
                field.options = await this.resolveDropdownOptions(field);
                form.dropdown(formattedName, field.options.length > 0 ? field.options : [""], { defaultValueIndex: 0 });
                break;
            }
            case "toggle":
                form.toggle(formattedName, { defaultValue: false });
                break;
        }
    }

    /**
     * Handles modal form cancellation or close events.
     * @param {ModalFormResponse} response - Server UI form response.
     * @param {DynamicField[]} fields - Form fields collection.
     * @param {string} title - Modal title.
     * @param {Command} command - Parent command context.
     * @param {string[]} commandArray - Command flags array.
     * @param {boolean} [cryptoES] - Cryptographic toggle flag.
     * @param {string} [commandOrder] - Argument position ordering rules.
     * @param {string[]} [requiredFields] - Required fields array.
     */
    private async handleModalCancellation(
        response: ModalFormResponse,
        fields: DynamicField[],
        title: string,
        command: Command,
        commandArray: string[],
        cryptoES?: boolean,
        commandOrder?: string,
        requiredFields?: string[]
    ): Promise<void> {
        if (response.cancelationReason === "UserBusy") {
            return this.showModalForm(fields, title, command, commandArray, cryptoES, commandOrder, requiredFields);
        }
        return this.buildCommandMenu(command);
    }

    /**
     * Shows a ModalFormData form to collect dynamic input from the player.
     *
     * @param {DynamicField[]} fields - Dynamic fields to render in the modal.
     * @param {string} title - Title of the modal form.
     * @param {Command} command - Parent command object used to return to the previous menu.
     * @param {string[]} commandArray - Static command arguments.
     * @param {boolean} [cryptoES] - Whether to apply cryptographic handlers.
     * @param {string} [commandOrder] - Argument ordering rule ('arg-command' or default).
     * @param {string[]} [requiredFields] - Filter list of required dynamic fields.
     */
    private async showModalForm(fields: DynamicField[], title: string, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]): Promise<void> {
        const form = new ModalFormData().title(title);

        for (const field of fields) {
            await this.renderFormField(form, field);
        }

        try {
            const response = await form.show(this.player);

            if (response.canceled) {
                return await this.handleModalCancellation(response, fields, title, command, commandArray, cryptoES, commandOrder, requiredFields);
            }

            const args = this.parseFormResponse(response, fields, requiredFields);
            const finalCommand = this.buildCommandString(commandOrder, commandArray, args);

            const chatSendBeforeEvent = { cancel: false, message: "", sender: this.player };
            command.execute(chatSendBeforeEvent, finalCommand, cryptoES ? CryptoES : undefined);
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Extracts text value from form submission response.
     * @param {unknown} rawValue - Raw form value from response.
     * @returns {string} Trimmed text string or default "0".
     */
    private parseTextFieldValue(rawValue: unknown): string {
        return (rawValue as string)?.trim() ?? "0";
    }

    /**
     * Extracts selected dropdown option from form submission response.
     * @param {unknown} rawValue - Raw form value from response.
     * @param {DynamicField} field - Target dropdown dynamic field configuration.
     * @returns {string | undefined} Selected option value formatted or undefined.
     */
    private parseDropdownFieldValue(rawValue: unknown, field: DynamicField): string | undefined {
        const selectedIndex = rawValue as number;
        const value = field.options?.[selectedIndex]?.trim();
        if (!value) return undefined;

        if (field.sourceType === "chests" && !value.startsWith("minecraft:")) {
            return `minecraft:${value}`;
        }
        return value;
    }

    /**
     * Processes individual form field values from modal submission response.
     * @param {unknown} rawValue - Raw form input value.
     * @param {DynamicField} field - Target field definition.
     * @param {string[]} args - Global positional arguments array.
     * @param {Record<string, string[]>} groupedValues - Grouped flag arguments lookup.
     */
    private processFormFieldValue(rawValue: unknown, field: DynamicField, args: string[], groupedValues: Record<string, string[]>): void {
        let value: string | undefined;

        if (field.type === "text") {
            value = this.parseTextFieldValue(rawValue);
        } else if (field.type === "dropdown") {
            value = this.parseDropdownFieldValue(rawValue, field);
            if (!value) return;
        } else if (field.type === "toggle") {
            const toggle = rawValue as boolean;
            if (field.arg && toggle) {
                args.push(field.arg);
            }
            return;
        }

        const resolvedValue = value || "0";
        if (field.arg) {
            groupedValues[field.arg] ??= [];
            groupedValues[field.arg]!.push(resolvedValue);
        } else {
            args.push(resolvedValue);
        }
    }

    /**
     * Parses the player's input from a modal form into an array of command arguments.
     * @param {ModalFormResponse} [response] - Response payload from UI modal submission.
     * @param {DynamicField[]} [fields] - Field definitions list.
     * @param {string[]} [requiredFields] - Required field key filters.
     * @returns {string[]} Formatted positional command arguments array.
     */
    private parseFormResponse(response?: ModalFormResponse, fields: DynamicField[] = [], requiredFields: string[] = []): string[] {
        if (!response?.formValues) return [];

        const args: string[] = [];
        let index = 0;
        const groupedValues: Record<string, string[]> = {};

        for (const field of fields) {
            const isFieldRequired = !field.requiredFields || field.requiredFields.some((rf) => requiredFields.includes(rf));
            if (isFieldRequired) {
                const rawValue = response.formValues[index++];
                this.processFormFieldValue(rawValue, field, args, groupedValues);
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
 * Opens the main Paradox GUI for a player.
 * @param player The player to open the GUI for.
 */
export function openMainGui(player: Player): void {
    system.run(() => new GUIManager(player).openMainGui());
}

/**
 * Helper function to open a specific command's GUI directly, bypassing the main menu.
 * Useful for item-based shortcuts or automated UI triggers.
 * @param player The player to show the GUI to.
 * @param command The Command object containing guiInstructions.
 */
export function openCommandGui(player: Player, command: Command): Promise<void> {
    return new GUIManager(player)["buildCommandMenu"](command);
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
        openMainGui(player);
    },
};

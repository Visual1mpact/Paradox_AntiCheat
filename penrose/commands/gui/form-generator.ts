import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command, DynamicField, ActionFormButton } from "../../classes/core/command-handler";
import { chestLockDB, commandHandler, homesDB, waypointsDB } from "../../event-listeners/world-initialize";
import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import * as CryptoES from "../../node_modules/crypto-es";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";
import { LandClaimManager } from "../utility/land-claim";

/** Cache static icon path mappings to avoid object allocations in hot paths */
const CATEGORY_ICONS: Record<string, string> = {
    Moderation: "textures/items/diamond_sword.png",
    Utility: "textures/items/compass_item.png",
    Modules: "textures/ui/gear.png",
};

/**
 * GUIManager handles all GUI interactions for a player, including:
 * - Main menu
 * - Category menus
 * - Action forms
 * - Modal forms with dynamic fields
 * - Executing commands based on player input
 */
class GUIManager {
    /** The player viewing the GUI */
    private player: Player;
    /** Security clearance level of the player */
    private playerSecurityClearance: number;

    /**
     * Constructs a new GUIManager instance.
     * @param {Player} player - Target player entity
     */
    constructor(player: Player) {
        this.player = player;
        this.playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;
    }

    /**
     * Helper to safely handle form errors (ignoring player quit/rejection errors).
     * @param {unknown} err - Caught exception
     */
    private handleFormError(err: unknown): void {
        const errorMsg = String(err);
        if (errorMsg.includes("Player quit before responding") || errorMsg.includes("FormRejectError")) {
            return;
        }
        console.error("[Paradox] GUI Error:", err);
    }

    /**
     * Returns the texture path for a category icon in O(1) time.
     * @param {string} category - Category name
     * @returns {string} Icon texture path or empty string
     */
    private getCategoryIconPath(category: string): string {
        return CATEGORY_ICONS[category] ?? "";
    }

    /**
     * Opens the main GUI menu showing accessible categories for the player.
     * Optimizes category sorting and filtering in O(1) dynamic memory allocations.
     * @returns {Promise<void>}
     */
    public async openMainGui(): Promise<void> {
        const commands = commandHandler.getRegisteredCommands();
        const categoriesMap: Map<string, Command[]> = new Map();

        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i]!;
            if (cmd.name !== "gui" && cmd.securityClearance <= this.playerSecurityClearance) {
                let categoryList = categoriesMap.get(cmd.category);
                if (!categoryList) {
                    categoryList = [];
                    categoriesMap.set(cmd.category, categoryList);
                }
                categoryList.push(cmd);
            }
        }

        if (categoriesMap.size === 0) {
            this.player.sendMessage("§o§c[Paradox] You do not have access to any commands.");
            return;
        }

        const categoryNames = Array.from(categoriesMap.keys()).sort((a, b) => a.localeCompare(b));
        const form = new ActionFormData().title("Main Menu").body("Select a category:");

        for (let i = 0; i < categoryNames.length; i++) {
            const cat = categoryNames[i]!;
            form.button(cat, this.getCategoryIconPath(cat));
        }

        try {
            const res = await form.show(this.player);
            if (res.canceled && res.cancelationReason === "UserBusy") {
                return this.openMainGui();
            }
            if (!res.canceled) {
                const selectedCategoryName = categoryNames[res.selection ?? 0];
                if (!selectedCategoryName) return;
                const selectedCommands = categoriesMap.get(selectedCategoryName)!;
                await this.openCategoryMenu(selectedCategoryName, selectedCommands);
            }
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Opens a menu showing all commands within a category.
     * @param {string} categoryName - Name of the category
     * @param {Command[]} commands - Array of Command objects in the category
     * @returns {Promise<void>}
     */
    private async openCategoryMenu(categoryName: string, commands: Command[]): Promise<void> {
        const form = new ActionFormData().title(`${categoryName} Commands`).body("Select a command:");
        commands.sort((a, b) => a.name.localeCompare(b.name));

        for (let i = 0; i < commands.length; i++) {
            form.button(commands[i]!.name, commands[i]!.icon);
        }
        form.button("Back", "textures/ui/back_button_default.png");

        try {
            const res = await form.show(this.player);
            if (res.canceled) return;
            if (res.selection === commands.length) return this.openMainGui();

            const selectedCommand = commands[res.selection ?? 0];
            if (!selectedCommand) return;
            await this.buildCommandMenu(selectedCommand);
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Builds and shows the GUI form for a specific command.
     * Determines whether to show an ActionFormData or ModalFormData.
     * @param {Command} command - Target command definition
     * @returns {Promise<void>}
     */
    private async buildCommandMenu(command: Command): Promise<void> {
        const gui = command.guiInstructions;
        if (!gui) return console.error("[Paradox] No GUI instructions found for command.");

        const { formType, title, description = "", actions = [], dynamicFields = [], commandOrder } = gui;

        if (formType === "ActionFormData") {
            await this.showActionForm(actions, title, description, command, dynamicFields, commandOrder);
        } else if (formType === "ModalFormData") {
            const actionCmds: string[] = [];
            const reqFields: string[] = [];

            for (let i = 0; i < actions.length; i++) {
                const act = actions[i]!;
                if (act.command) actionCmds.push(...act.command);
                if (act.requiredFields) reqFields.push(...act.requiredFields);
            }

            await this.showModalForm(dynamicFields, title, command, actionCmds, false, commandOrder, reqFields);
        }
    }

    /**
     * Displays an ActionFormData form for a set of command actions.
     * @param {ActionFormButton[]} actions - List of action buttons
     * @param {string} title - Form title
     * @param {string} description - Form description body
     * @param {Command} command - Target command
     * @param {DynamicField[]} dynamicFields - Associated dynamic fields
     * @param {string} [commandOrder] - Argument position ordering rules
     * @returns {Promise<void>}
     */
    private async showActionForm(actions: ActionFormButton[], title: string, description: string, command: Command, dynamicFields: DynamicField[], commandOrder?: string): Promise<void> {
        actions = commandHandler.filterButtonsBySecurity(actions, this.playerSecurityClearance);

        const form = new ActionFormData().title(title).body(description);

        for (let i = 0; i < actions.length; i++) {
            form.button(actions[i]!.name, actions[i]!.icon);
        }
        form.button("Back", "textures/ui/back_button_default.png");

        try {
            const res = await form.show(this.player);
            if (res.canceled) return;
            if (res.selection === actions.length) return this.openMainGui();

            const selectedAction = actions[res.selection ?? 0];
            if (!selectedAction) return;

            if (selectedAction.generateSubActions && selectedAction.subActions?.length) {
                await this.showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description ?? "", command, dynamicFields, commandOrder);
            } else {
                await this.handleActionSelection(selectedAction, dynamicFields, title, command, commandOrder);
            }
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Handles a selected action button, deciding if a modal form is required or command executes directly.
     * @param {ActionFormButton} action - Selected action button
     * @param {DynamicField[]} dynamicFields - Array of dynamic input fields
     * @param {string} title - Action title
     * @param {Command} command - Target command object
     * @param {string} [commandOrder] - Command execution order setting
     * @returns {Promise<void>}
     */
    private async handleActionSelection(action: ActionFormButton, dynamicFields: DynamicField[], title: string, command: Command, commandOrder?: string): Promise<void> {
        const { requiredFields = [], crypto } = action;

        if (requiredFields.includes("chestKey") && chestLockDB.listPointers().length === 0) {
            this.player.sendMessage("§2[§7Paradox§2]§o§7 No locked chests exist yet.");
            return;
        }

        if (requiredFields.length > 0) {
            const fields: DynamicField[] = [];
            for (let i = 0; i < dynamicFields.length; i++) {
                const field = dynamicFields[i]!;
                if (field.requiredFields && requiredFields.some((rf) => field.requiredFields!.includes(rf))) {
                    fields.push(field);
                }
            }
            await this.showModalForm(fields, title, command, action.command ?? [], crypto, commandOrder, requiredFields);
        } else {
            const chatSendBeforeEvent = { cancel: false, message: "", sender: this.player };
            command.execute(chatSendBeforeEvent, action.command ?? [], crypto ? CryptoES : undefined);
        }
    }

    /**
     * Fetches dynamic entity type options present in the target dimension.
     * @returns {string[]} Formatted entity type strings
     */
    private getEntityDropdownOptions(): string[] {
        const transform = PlayerLocationCache.getTransform(this.player);
        const dimension = transform?.dimension ?? world.getDimension(this.player.dimension.id);
        const entities = dimension.getEntities({ excludeTypes: ["player"] });
        const entitySet = new Set<string>();

        for (let i = 0; i < entities.length; i++) {
            entitySet.add(entities[i]!.typeId.replace("minecraft:", ""));
        }
        return Array.from(entitySet);
    }

    /**
     * Fetches registered chest lock keys from database.
     * @returns {string[]} Formatted chest keys
     */
    private getChestDropdownOptions(): string[] {
        const pointers = chestLockDB.listPointers();
        const result: string[] = new Array(pointers.length);

        for (let i = 0; i < pointers.length; i++) {
            const ptr = pointers[i]!;
            const key = ptr.slice(ptr.lastIndexOf("/") + 1);
            result[i] = key.startsWith("minecraft:") ? key.slice(10) : key;
        }
        return result;
    }

    /**
     * Resolves saved waypoint names for current player.
     * @returns {Promise<string[]>} List of waypoint names
     */
    private async getWaypointDropdownOptions(): Promise<string[]> {
        const dbEntry = (await waypointsDB.get(this.player.id)) as { savedWaypoints?: Record<string, unknown> } | undefined;
        const options = dbEntry?.savedWaypoints ? Object.keys(dbEntry.savedWaypoints) : [];
        return options.length > 0 ? options : ["No Waypoints Saved"];
    }

    /**
     * Decrypts and resolves home names for current player.
     * @returns {Promise<string[]>} List of decrypted home names
     */
    private async getHomeDropdownOptions(): Promise<string[]> {
        const dbEntry = await homesDB.get(this.player.id);
        const locations = dbEntry?.locations ?? [];
        if (locations.length === 0) return ["No Homes Saved"];

        const obfuscatedKey = CryptoES.SHA256(this.player.id).toString();
        const options: string[] = new Array(locations.length);

        for (let i = 0; i < locations.length; i++) {
            try {
                const bytes = CryptoES.AES.decrypt(locations[i]!, obfuscatedKey);
                const decrypted = bytes.toString(CryptoES.Utf8);
                options[i] = decrypted.split(":")[1] ?? "Unknown";
            } catch {
                options[i] = "Corrupted Data";
            }
        }
        return options;
    }

    /**
     * Resolves claim ID options owned by current player.
     * @param {DynamicField} field - Field configuration
     * @returns {string[] | undefined} Custom claims array or undefined fallback
     */
    private getCustomDropdownOptions(field: DynamicField): string[] | undefined {
        if (field.requiredFields?.includes("claimId")) {
            const userClaims = LandClaimManager.getInstance().getClaimsByOwner(this.player.id);
            if (userClaims.length === 0) return ["No Claims Found"];

            const options: string[] = new Array(userClaims.length);
            for (let i = 0; i < userClaims.length; i++) {
                options[i] = userClaims[i]!.id;
            }
            return options;
        }
        return undefined;
    }

    /**
     * Resolves the string array options for a dynamic dropdown based on its sourceType in low cyclomatic complexity handlers.
     * @param {DynamicField} field - Target dropdown field configuration
     * @returns {Promise<string[]>} Resolved dropdown options
     */
    private async resolveDropdownOptions(field: DynamicField): Promise<string[]> {
        switch (field.sourceType) {
            case "players":
                return PlayerCache.getPlayerNamesArray();
            case "entities":
                return this.getEntityDropdownOptions();
            case "chests":
                return this.getChestDropdownOptions();
            case "playerWaypoints":
                return this.getWaypointDropdownOptions();
            case "playerHomes":
                return this.getHomeDropdownOptions();
            case "custom":
                return this.getCustomDropdownOptions(field) ?? field.options ?? [""];
            default:
                return field.options ?? [""];
        }
    }

    /**
     * Formats plain field strings to Title Case display values without unnecessary allocations.
     * @param {string} [value] - String value to format
     * @returns {string} Formatted Title Case string
     */
    private formatFieldString(value?: string): string {
        if (!value) return "";
        const spaceIdx = value.indexOf(" ");
        if (spaceIdx === -1) {
            return value.charAt(0).toUpperCase() + value.slice(1);
        }
        const words = value.split(" ");
        for (let i = 0; i < words.length; i++) {
            const w = words[i]!;
            if (w.length > 0) {
                words[i] = w.charAt(0).toUpperCase() + w.slice(1);
            }
        }
        return words.join(" ");
    }

    /**
     * Renders an individual dynamic field element into the ModalFormData instance.
     * @param {ModalFormData} form - Target modal form instance
     * @param {DynamicField} field - Dynamic field definition
     * @returns {Promise<void>}
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
     * @param {ModalFormResponse} response - Server UI form response
     * @param {DynamicField[]} fields - Form fields collection
     * @param {string} title - Modal title
     * @param {Command} command - Parent command context
     * @param {string[]} commandArray - Command flags array
     * @param {boolean} [cryptoES] - Cryptographic toggle flag
     * @param {string} [commandOrder] - Argument position ordering rules
     * @param {string[]} [requiredFields] - Required fields array
     * @returns {Promise<void>}
     */
    private async handleModalCancellation(response: ModalFormResponse, fields: DynamicField[], title: string, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]): Promise<void> {
        if (response.cancelationReason === "UserBusy") {
            return this.showModalForm(fields, title, command, commandArray, cryptoES, commandOrder, requiredFields);
        }
        return this.buildCommandMenu(command);
    }

    /**
     * Shows a ModalFormData form to collect dynamic input from the player.
     * @param {DynamicField[]} fields - Dynamic fields to render in the modal
     * @param {string} title - Title of the modal form
     * @param {Command} command - Parent command object
     * @param {string[]} commandArray - Static command arguments
     * @param {boolean} [cryptoES] - Cryptographic handlers flag
     * @param {string} [commandOrder] - Argument ordering rule ('arg-command' or default)
     * @param {string[]} [requiredFields] - Filter list of required dynamic fields
     * @returns {Promise<void>}
     */
    private async showModalForm(fields: DynamicField[], title: string, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[]): Promise<void> {
        const form = new ModalFormData().title(title);

        for (let i = 0; i < fields.length; i++) {
            await this.renderFormField(form, fields[i]!);
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
     * Extracts text value from form submission response in O(1) string checks.
     * @param {unknown} rawValue - Raw form value from response
     * @returns {string} Trimmed text string or default "0"
     */
    private parseTextFieldValue(rawValue: unknown): string {
        const val = typeof rawValue === "string" ? rawValue.trim() : "";
        return val.length > 0 ? val : "0";
    }

    /**
     * Extracts selected dropdown option from form submission response in O(1) time.
     * @param {unknown} rawValue - Raw form value from response
     * @param {DynamicField} field - Target dropdown dynamic field configuration
     * @returns {string | undefined} Selected option value formatted or undefined
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
     * @param {unknown} rawValue - Raw form input value
     * @param {DynamicField} field - Target field definition
     * @param {string[]} args - Global positional arguments array
     * @param {Record<string, string[]>} groupedValues - Grouped flag arguments lookup
     */
    private processFormFieldValue(rawValue: unknown, field: DynamicField, args: string[], groupedValues: Record<string, string[]>): void {
        let value: string | undefined;

        if (field.type === "text") {
            value = this.parseTextFieldValue(rawValue);
        } else if (field.type === "dropdown") {
            value = this.parseDropdownFieldValue(rawValue, field);
            if (!value) return;
        } else if (field.type === "toggle") {
            if (field.arg && rawValue === true) {
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
     * @param {ModalFormResponse} [response] - Response payload from UI modal submission
     * @param {DynamicField[]} [fields] - Field definitions list
     * @param {string[]} [requiredFields] - Required field key filters
     * @returns {string[]} Formatted positional command arguments array
     */
    private parseFormResponse(response?: ModalFormResponse, fields: DynamicField[] = [], requiredFields: string[] = []): string[] {
        if (!response?.formValues) return [];

        const args: string[] = [];
        let index = 0;
        const groupedValues: Record<string, string[]> = {};

        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!;
            const isFieldRequired = !field.requiredFields || field.requiredFields.some((rf) => requiredFields.includes(rf));
            if (isFieldRequired) {
                const rawValue = response.formValues[index++];
                this.processFormFieldValue(rawValue, field, args, groupedValues);
            }
        }

        const keys = Object.keys(groupedValues);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]!;
            args.push(key, ...groupedValues[key]!);
        }

        return args;
    }

    /**
     * Combines static and dynamic command arguments efficiently.
     * @param {string} [order] - Order specification ('arg-command' or default)
     * @param {string[]} [staticArgs] - Static command arguments
     * @param {string[]} [dynamicArgs] - Dynamic command arguments
     * @returns {string[]} Combined flat string array
     */
    private buildCommandString(order: string | undefined, staticArgs: string[] = [], dynamicArgs: string[] = []): string[] {
        const result: string[] = [];
        const firstArr = order === "arg-command" ? dynamicArgs : staticArgs;
        const secondArr = order === "arg-command" ? staticArgs : dynamicArgs;

        this.appendTokens(firstArr, result);
        this.appendTokens(secondArr, result);

        return result;
    }

    /**
     * Pushes trimmed non-empty tokens into an accumulator without intermediate flatMap arrays.
     * @param {string[]} source - Array of raw strings
     * @param {string[]} target - Output token array
     */
    private appendTokens(source: string[], target: string[]): void {
        for (let i = 0; i < source.length; i++) {
            const item = source[i]!.trim();
            if (!item) continue;
            const parts = item.split(/\s+/);
            for (let j = 0; j < parts.length; j++) {
                if (parts[j]) target.push(parts[j]!);
            }
        }
    }
}

/**
 * Opens the main Paradox GUI for a player.
 * @param {Player} player - The player to open the GUI for
 */
export function openMainGui(player: Player): void {
    system.run(() => new GUIManager(player).openMainGui());
}

/**
 * Helper function to open a specific command's GUI directly, bypassing the main menu.
 * Useful for item-based shortcuts or automated UI triggers.
 * @param {Player} player - The player to show the GUI to
 * @param {Command} command - The Command object containing guiInstructions
 * @returns {Promise<void>}
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
        player.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to view the GUI.");
        openMainGui(player);
    },
};

import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { ActionFormData, ModalFormData, ModalFormResponse } from "@minecraft/server-ui";
import * as CryptoES from "../../node_modules/crypto-es";

import { Command, CommandHandler } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";
import { chestLockDB, homesDB, waypointsDB } from "../../event-listeners/world-initialize";
import { LandClaimManager } from "../utility/land-claim";
import { DynamicField, GUIInstructions, ActionFormButton, UIProviderRegistry } from "../../types/gui-schema";

/** Cache static icon path mappings to avoid object allocations in hot paths */
const CATEGORY_ICONS: Record<string, string> = {
    Moderation: "textures/items/diamond_sword.png",
    Utility: "textures/items/compass_item.png",
    Modules: "textures/ui/gear.png",
};

// ==========================================
// OPTION PROVIDER REGISTRATION (Decoupled)
// ==========================================
UIProviderRegistry.register("players", () => PlayerCache.getPlayerNamesArray());

UIProviderRegistry.register("entities", (player: Player) => {
    const transform = PlayerLocationCache.getTransform(player);
    const dimension = transform?.dimension ?? world.getDimension(player.dimension.id);
    const entities = dimension.getEntities({ excludeTypes: ["player"] });
    const entitySet = new Set<string>();

    for (let i = 0; i < entities.length; i++) {
        entitySet.add(entities[i]!.typeId.replace("minecraft:", ""));
    }
    return Array.from(entitySet);
});

UIProviderRegistry.register("chests", () => {
    const pointers = chestLockDB.listPointers();
    const result: string[] = new Array(pointers.length);

    for (let i = 0; i < pointers.length; i++) {
        const ptr = pointers[i]!;
        const key = ptr.slice(ptr.lastIndexOf("/") + 1);
        result[i] = key.startsWith("minecraft:") ? key.slice(10) : key;
    }
    return result;
});

UIProviderRegistry.register("playerWaypoints", async (player: Player) => {
    const dbEntry = (await waypointsDB.get(player.id)) as { savedWaypoints?: Record<string, unknown> } | undefined;
    const options = dbEntry?.savedWaypoints ? Object.keys(dbEntry.savedWaypoints) : [];
    return options.length > 0 ? options : ["No Waypoints Saved"];
});

UIProviderRegistry.register("playerHomes", async (player: Player) => {
    const dbEntry = await homesDB.get(player.id);
    const locations = dbEntry?.locations ?? [];
    if (locations.length === 0) return ["No Homes Saved"];

    const obfuscatedKey = CryptoES.SHA256(player.id).toString();
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
});

UIProviderRegistry.register("custom", (player: Player, field: DynamicField) => {
    if (field.requiredFields?.includes("claimId")) {
        const userClaims = LandClaimManager.getInstance().getClaimsByOwner(player.id);
        if (userClaims.length === 0) return ["No Claims Found"];

        const options: string[] = new Array(userClaims.length);
        for (let i = 0; i < userClaims.length; i++) {
            options[i] = userClaims[i]!.id;
        }
        return options;
    }
    return field.options ?? [""];
});

// ==========================================
// CORE AAA GUI MANAGER ENGINE
// ==========================================

/** Represents an entry in the navigation back-stack */
interface NavigationFrame {
    title: string;
    handler: () => Promise<void>;
}

export class GUIManager {
    private player: Player;
    private playerSecurityClearance: number;
    private breadcrumbs: string[] = ["Main"];
    private backStack: NavigationFrame[] = [];

    /** Pre-sorted command index cached per clearance level */
    private static commandCache: Map<number, Map<string, Command[]>> = new Map();

    /**
     * Constructs a new GUIManager instance.
     * @param {Player} player - Target player entity
     */
    constructor(player: Player) {
        this.player = player;
        this.playerSecurityClearance = (player.getDynamicProperty("securityClearance") as number) ?? 1;
    }

    /**
     * Clears and builds pre-sorted categories cache for registered commands.
     */
    public static invalidateCommandCache(): void {
        GUIManager.commandCache.clear();
    }

    /**
     * Retrieves pre-sorted and categorized commands matching a security clearance level in O(1) time.
     * @param {number} clearance - Player clearance level
     * @returns {Map<string, Command[]>} Pre-indexed map of category to commands
     */
    private getSortedCategories(clearance: number): Map<string, Command[]> {
        let cached = GUIManager.commandCache.get(clearance);
        if (cached) return cached;

        const commands = getCommandHandler().getRegisteredCommands();
        cached = new Map<string, Command[]>();

        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i]!;
            if (cmd.name !== "gui" && cmd.securityClearance <= clearance) {
                let categoryList = cached.get(cmd.category);
                if (!categoryList) {
                    categoryList = [];
                    cached.set(cmd.category, categoryList);
                }
                categoryList.push(cmd);
            }
        }

        // Sort categories and inner commands once globally
        const sortedCategories = new Map<string, Command[]>();
        const sortedCategoryNames = Array.from(cached.keys()).sort((a, b) => a.localeCompare(b));

        for (let i = 0; i < sortedCategoryNames.length; i++) {
            const catName = sortedCategoryNames[i]!;
            const catCommands = cached.get(catName)!.sort((a, b) => a.name.localeCompare(b.name));
            sortedCategories.set(catName, catCommands);
        }

        GUIManager.commandCache.set(clearance, sortedCategories);
        return sortedCategories;
    }

    /**
     * Renders breadcrumb context strings for title headers.
     * @returns {string} Formatted title with breadcrumbs in all caps
     */
    private renderTitle(currentTitle: string): string {
        return `§8${this.breadcrumbs.join(" > ").toUpperCase()}\n§r§l${currentTitle}`;
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
        console.error("[Paradox] GUI Engine Error:", err);
    }

    /**
     * Pushes a step into the navigation back-stack.
     * @param {string} label - Breadcrumb name
     * @param {() => Promise<void>} frameHandler - Target view function
     */
    private pushFrame(label: string, frameHandler: () => Promise<void>): void {
        this.breadcrumbs.push(label);
        this.backStack.push({ title: label, handler: frameHandler });
    }

    /**
     * Navigates back to previous screen in stack.
     */
    private async popFrame(): Promise<void> {
        if (this.backStack.length <= 1) {
            this.breadcrumbs = ["Main"];
            return this.openMainGui(true);
        }
        this.backStack.pop();
        this.breadcrumbs.pop();
        const previousFrame = this.backStack[this.backStack.length - 1];
        if (previousFrame) {
            await previousFrame.handler();
        }
    }

    /**
     * Opens the main GUI menu showing accessible categories for the player.
     * @param {boolean} [isReset=false] - Reset stack state flag
     * @returns {Promise<void>}
     */
    public async openMainGui(isReset: boolean = false): Promise<void> {
        if (isReset || this.backStack.length === 0) {
            this.breadcrumbs = ["Main"];
            this.backStack = [{ title: "Main", handler: () => this.openMainGui(true) }];
        }

        const categoriesMap = this.getSortedCategories(this.playerSecurityClearance);
        if (categoriesMap.size === 0) {
            this.player.sendMessage("§o§c[Paradox] You do not have access to any commands.");
            return;
        }

        const categoryNames = Array.from(categoriesMap.keys());
        const form = new ActionFormData().title(this.renderTitle("Main Menu")).body("Select a command category:");

        for (let i = 0; i < categoryNames.length; i++) {
            const cat = categoryNames[i]!;
            form.button(cat, CATEGORY_ICONS[cat] ?? "");
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
                this.pushFrame(selectedCategoryName, () => this.openCategoryMenu(selectedCategoryName, selectedCommands));
                await this.openCategoryMenu(selectedCategoryName, selectedCommands);
            }
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Opens a menu showing pre-sorted commands within a category.
     * @param {string} categoryName - Name of category
     * @param {Command[]} commands - List of commands in category
     * @returns {Promise<void>}
     */
    private async openCategoryMenu(categoryName: string, commands: Command[]): Promise<void> {
        const form = new ActionFormData().title(this.renderTitle(`${categoryName} Commands`)).body("Select a command:");

        for (let i = 0; i < commands.length; i++) {
            form.button(commands[i]!.name, commands[i]!.icon);
        }
        form.button("§cBack", "textures/ui/back_button_default.png");

        try {
            const res = await form.show(this.player);
            if (res.canceled) return;
            if (res.selection === commands.length) {
                return await this.popFrame();
            }

            const selectedCommand = commands[res.selection ?? 0];
            if (!selectedCommand) return;

            this.pushFrame(selectedCommand.name, () => this.buildCommandMenu(selectedCommand));
            await this.buildCommandMenu(selectedCommand);
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Builds dynamic form structure based on instructions.
     * @param {Command} command - Target command context
     * @returns {Promise<void>}
     */
    private async buildCommandMenu(command: Command): Promise<void> {
        const gui = command.guiInstructions as GUIInstructions | undefined;
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
     * Displays ActionFormData forms.
     * @param {ActionFormButton[]} actions - List of action buttons
     * @param {string} title - Form title
     * @param {string} description - Description
     * @param {Command} command - Parent command
     * @param {DynamicField[]} dynamicFields - Associated dynamic fields
     * @param {string} [commandOrder] - Execution order rules
     * @returns {Promise<void>}
     */
    private async showActionForm(actions: ActionFormButton[], title: string, description: string, command: Command, dynamicFields: DynamicField[], commandOrder?: string): Promise<void> {
        const filteredActions = getCommandHandler().filterButtonsBySecurity(actions, this.playerSecurityClearance);

        const form = new ActionFormData().title(this.renderTitle(title)).body(description);

        for (let i = 0; i < filteredActions.length; i++) {
            form.button(filteredActions[i]!.name, filteredActions[i]!.icon);
        }
        form.button("§cBack", "textures/ui/back_button_default.png");

        try {
            const res = await form.show(this.player);
            if (res.canceled) return;
            if (res.selection === filteredActions.length) {
                return await this.popFrame();
            }

            const selectedAction = filteredActions[res.selection ?? 0];
            if (!selectedAction) return;

            if (selectedAction.generateSubActions && selectedAction.subActions?.length) {
                this.pushFrame(selectedAction.name, () => this.showActionForm(selectedAction.subActions!, selectedAction.name, selectedAction.description ?? "", command, dynamicFields, commandOrder));
                await this.showActionForm(selectedAction.subActions, selectedAction.name, selectedAction.description ?? "", command, dynamicFields, commandOrder);
            } else {
                await this.handleActionSelection(selectedAction, dynamicFields, title, command, commandOrder);
            }
        } catch (err) {
            this.handleFormError(err);
        }
    }

    /**
     * Handles selection of individual action buttons.
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
     * Formats plain strings to Title Case display labels.
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
            if (w.length > 0) words[i] = w.charAt(0).toUpperCase() + w.slice(1);
        }
        return words.join(" ");
    }

    /**
     * Renders an individual dynamic field element into ModalFormData.
     */
    private async renderFormField(form: ModalFormData, field: DynamicField): Promise<void> {
        const formattedName = this.formatFieldString(field.name);

        switch (field.type) {
            case "text":
                form.textField(formattedName, this.formatFieldString(field.placeholder), field.defaultValue ? { defaultValue: field.defaultValue } : undefined);
                break;
            case "dropdown": {
                const options = field.sourceType ? await UIProviderRegistry.resolve(field.sourceType, this.player, field) : (field.options ?? [""]);
                field.options = options;
                form.dropdown(formattedName, options.length > 0 ? options : [""], { defaultValueIndex: 0 });
                break;
            }
            case "toggle":
                form.toggle(formattedName, { defaultValue: field.defaultValue ?? false });
                break;
        }
    }

    /**
     * Displays a ModalFormData form with interactive input validation feedback.
     */
    private async showModalForm(fields: DynamicField[], title: string, command: Command, commandArray: string[], cryptoES?: boolean, commandOrder?: string, requiredFields?: string[], validationErrorMsg?: string): Promise<void> {
        const displayTitle = validationErrorMsg ? `§c${title} (${validationErrorMsg})` : title;
        const form = new ModalFormData().title(this.renderTitle(displayTitle));

        for (let i = 0; i < fields.length; i++) {
            await this.renderFormField(form, fields[i]!);
        }

        try {
            const response = await form.show(this.player);

            if (response.canceled) {
                if (response.cancelationReason === "UserBusy") {
                    return this.showModalForm(fields, title, command, commandArray, cryptoES, commandOrder, requiredFields, validationErrorMsg);
                }
                return await this.popFrame();
            }

            // Perform interactive validation over text inputs
            const error = this.validateFormInputs(fields, response.formValues, requiredFields);
            if (error) {
                return this.showModalForm(fields, title, command, commandArray, cryptoES, commandOrder, requiredFields, error);
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
     * Validates form submission values against field schemas before execution.
     * @param {DynamicField[]} fields - Dynamic fields list
     * @param {unknown[] | undefined} formValues - Raw values submitted from form
     * @param {string[]} [requiredFields] - Active required fields filter
     * @returns {string | undefined} Error message or undefined if valid
     */
    private validateFormInputs(fields: DynamicField[], formValues?: unknown[], requiredFields: string[] = []): string | undefined {
        if (!formValues) return "Invalid response";

        let index = 0;
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!;
            const isFieldRequired = !field.requiredFields || field.requiredFields.some((rf) => requiredFields.includes(rf));

            if (isFieldRequired) {
                const rawValue = formValues[index++];
                if (field.type === "text") {
                    const textVal = typeof rawValue === "string" ? rawValue.trim() : "";
                    if (field.validationRegex && !field.validationRegex.test(textVal)) {
                        return field.errorMessage ?? "Invalid text input";
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * Extracts text value from form submission.
     */
    private parseTextFieldValue(rawValue: unknown): string {
        const val = typeof rawValue === "string" ? rawValue.trim() : "";
        return val.length > 0 ? val : "0";
    }

    /**
     * Extracts selected dropdown option.
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
     * Processes individual field values.
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
     * Parses positional command arguments from submitted values.
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
     * Combines static and dynamic arguments.
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
     * Pushes non-empty tokens into accumulator array.
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

/** Opens the main Paradox GUI for a player */
export function openMainGui(player: Player): void {
    system.run(() => new GUIManager(player).openMainGui(true));
}

/** Opens a specific command GUI directly */
export function openCommandGui(player: Player, command: Command): Promise<void> {
    return new GUIManager(player)["buildCommandMenu"](command);
}

/** Main GUI command registration */
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

/**
 * Safely retrieves the shared CommandHandler singleton.
 */
function getCommandHandler(): CommandHandler {
    return CommandHandler.getInstance();
}

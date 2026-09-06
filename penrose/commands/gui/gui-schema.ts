import { Player } from "@minecraft/server";

/** Supported dynamic option source types */
export type DynamicSourceType = "players" | "entities" | "chests" | "playerWaypoints" | "playerHomes" | "custom";

/** Base configuration shared across all dynamic fields */
interface BaseField {
    /** Internal key identifier */
    name: string;
    /** Command flag associated with field (e.g., "--time") */
    arg?: string;
    /** Field dependencies that trigger this control */
    requiredFields?: string[];
    /** Dynamic source type for dropdown items */
    sourceType?: DynamicSourceType;
    /** Static dropdown options or cached values */
    options?: string[];
    /** Optional placeholder text */
    placeholder?: string;
}

/** Configuration for text input fields */
export interface TextField extends BaseField {
    type: "text";
    placeholder?: string;
    defaultValue?: string;
    /** Regex to validate user input before command compilation */
    validationRegex?: RegExp;
    /** Error message to display when validation fails */
    errorMessage?: string;
}

/** Configuration for dropdown selection fields */
export interface DropdownField extends BaseField {
    type: "dropdown";
}

/** Configuration for boolean toggle fields */
export interface ToggleField extends BaseField {
    type: "toggle";
    defaultValue?: boolean;
}

/** Discriminated union of all supported dynamic form fields */
export type DynamicField = TextField | DropdownField | ToggleField;

/** Configuration for form action buttons */
export interface ActionFormButton {
    name: string;
    command?: string[] | undefined;
    description?: string;
    requiredFields?: string[];
    generateModalForm?: boolean;
    generateSubActions?: boolean;
    subActions?: ActionFormButton[];
    icon?: string;
    securityClearance?: number;
    crypto?: boolean;
}

/** Schema structure defining command GUI layouts */
export interface GUIInstructions {
    formType: "ActionFormData" | "ModalFormData";
    title: string;
    description?: string;
    commandOrder?: "command-arg" | "arg-command";
    actions?: ActionFormButton[];
    dynamicFields?: DynamicField[];
}

/** Async resolver signature for dynamic dropdown data providers */
export type OptionProvider = (player: Player, field: DynamicField) => Promise<string[]> | string[];

/**
 * Registry service for dynamic UI dropdown option providers.
 * Decouples GUIManager from databases and external domain managers.
 */
export class UIProviderRegistry {
    private static providers: Map<DynamicSourceType, OptionProvider> = new Map();

    /**
     * Registers a custom dynamic option provider.
     * @param {DynamicSourceType} type - Target source type identifier
     * @param {OptionProvider} provider - Data fetching function
     */
    public static register(type: DynamicSourceType, provider: OptionProvider): void {
        this.providers.set(type, provider);
    }

    /**
     * Resolves options for a dynamic field using the registered provider.
     * @param {DynamicSourceType} type - Target source type identifier
     * @param {Player} player - Target player context
     * @param {DynamicField} field - Field configuration
     * @returns {Promise<string[]>} Resolved array of option strings
     */
    public static async resolve(type: DynamicSourceType, player: Player, field: DynamicField): Promise<string[]> {
        const provider = this.providers.get(type);
        if (!provider) return field.options ?? [""];
        return await provider(player, field);
    }
}

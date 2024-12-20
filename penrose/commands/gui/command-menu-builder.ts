import { ModalFormResponse } from "@minecraft/server-ui";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { Player, world } from "@minecraft/server";
import CryptoES from "../../node_modules/crypto-es/lib/index";

/**
 * Represents a dynamic input field in a form.
 */
interface DynamicField {
    type: "text" | "dropdown" | "toggle";
    name: string;
    arg?: string;
    placeholder?: string;
    options?: string[];
}

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
 * Builds a form menu based on instructions.
 * @param {Command} command - The command object.
 * @param {Player} player - The player interacting with the form.
 * @param {MinecraftEnvironment} minecraftEnvironment - The environment object.
 */
export function buildCommandMenu(command: Command, player: Player, minecraftEnvironment: MinecraftEnvironment) {
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
 * Displays an ActionFormData form.
 * @param {Action[]} actions - Array of actions.
 * @param {string} title - The title of the form.
 * @param {string} description - The description of the form.
 * @param {Player} player - The player interacting with the form.
 * @param {Command} command - The command object.
 * @param {MinecraftEnvironment} minecraftEnvironment - The environment object.
 * @param {DynamicField[]} dynamicFields - Array of dynamic fields.
 * @param {string | undefined} commandOrder - The command execution order.
 */
function showActionForm(actions: Action[], title: string, description: string, player: Player, command: Command, minecraftEnvironment: MinecraftEnvironment, dynamicFields: DynamicField[], commandOrder?: string) {
    const actionForm = minecraftEnvironment.initializeActionFormData().title(title).body(description);

    actions.forEach((action) => {
        actionForm.button(action.name);
    });

    actionForm
        .show(player)
        .then((response) => {
            if (!response.canceled && response.selection !== undefined) {
                const selectedAction = actions[response.selection];
                handleActionSelection(selectedAction, dynamicFields, title, player, command, minecraftEnvironment, commandOrder);
            }
        })
        .catch((error) => console.error("Error showing action form:", error));
}

/**
 * Handles the selection of an action.
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
 * Displays a ModalFormData form.
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
 */
function buildCommandString(commandOrder: string | undefined, selectedAction: string[] = [], args: string[] = []): string[] {
    // Split all arguments by spaces and flatten the array
    const splitArgs = (args: string[]): string[] => args.flatMap((arg) => arg.split(" "));

    const splitArgsList = splitArgs(args);

    // Use ternary operator to handle command order logic
    return commandOrder === "arg-command" ? [...splitArgsList, ...selectedAction] : [...selectedAction, ...splitArgsList];
}

/**
 * Parses user response into command arguments based on `DynamicField` definitions.
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
                    value = response.formValues[formIndex++] as string;
                    break;

                case "dropdown":
                    const selectedIndex = response.formValues[formIndex++] as number;
                    value = dynamicField.options[selectedIndex];
                    break;

                case "toggle":
                    value = (response.formValues[formIndex++] as boolean) ? "true" : "false";
                    break;
            }
        }

        const arg = dynamicField?.arg ?? commandArray?.[index] ?? "";
        args.push(`${arg} ${value}`);
    });

    return args;
}

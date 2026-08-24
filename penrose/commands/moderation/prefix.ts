import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";

/**
 * Represents the prefix command.
 */
export const prefixCommand: Command = {
    name: "prefix",
    description: "Changes the prefix for commands. Max is two characters.",
    usage: "{prefix}prefix [ <newPrefix> | --reset ]",
    examples: [`{prefix}prefix !!`, `{prefix}prefix @@`, `{prefix}prefix --reset`, `{prefix}prefix help`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/update.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Prefix Command",
        description:
            "Configure the global command trigger symbol used to invoke Paradox functionality.\n\n" +
            "§7• Define a custom prefix string up to 2 characters in length.\n" +
            "§7• Reserved characters like forward slash or section sign are prohibited for stability.\n" +
            "§7• Updating the prefix affects all administrative and utility commands.\n\n" +
            "§7Prefix Rules:\n" +
            "§7• Changes apply instantly and persist across server restarts.\n" +
            "§7• Use `--reset` to restore the default prefix (`:`).\n" +
            "§7• Only administrators with clearance level 4 can modify this configuration.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Change Prefix",
                description: "Select a new prefix for the commands.",
                requiredFields: ["prefix"],
                generateModalForm: true,
                icon: "textures/ui/WarningGlyph.png",
            },
            {
                name: "Reset to Default",
                command: ["--reset"],
                description: "Reset the command prefix to the default ':'.",
                generateModalForm: false,
                icon: "textures/ui/wysiwyg_reset.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nEnter New Prefix:",
                type: "text",
                placeholder: "Enter prefix (max 2 chars)",
                requiredFields: ["prefix"],
            },
        ],
    },

    /**
     * Executes the prefix command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<boolean>} A promise that resolves to true if the prefix update was successful, otherwise false.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []): Promise<boolean> => {
        if (!message) return Promise.resolve(false);
        const DEFAULT_PREFIX = ":";

        return new Promise<boolean>((resolve) => {
            const input = args[0]?.trim();

            // Check for the reset flag
            if (args.includes("--reset")) {
                world.setDynamicProperty("__prefix", DEFAULT_PREFIX);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Prefix has been reset to default: ${DEFAULT_PREFIX}§7`);
                return resolve(true);
            }

            if (input && input.length > 0) {
                // Limit the prefix to two characters
                const newPrefix: string = input.slice(0, 2);

                // Tightened validation: Prohibit /, §, whitespace, and alphanumeric characters
                const isIllegal = newPrefix.includes("/") || newPrefix.includes("§") || /\s/.test(newPrefix) || /[a-zA-Z0-9]/.test(newPrefix);

                if (isIllegal) {
                    message.sender.sendMessage("§o§c[Paradox] Illegal prefix. Use 1-2 symbols (no /, whitespace, or alphanumeric characters).");
                    return resolve(false);
                }

                // Retrieve the current prefix from dynamic properties
                const currentPrefix: string = world.getDynamicProperty("__prefix") as string;

                if (newPrefix !== currentPrefix) {
                    world.setDynamicProperty("__prefix", newPrefix);
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Prefix updated to: ${newPrefix}§7`);
                    return resolve(true);
                } else {
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Prefix is already "${newPrefix}§7".`);
                    return resolve(false);
                }
            } else {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 Please provide a valid 1-2 character symbol as a prefix.");
                return resolve(false);
            }
        });
    },
};

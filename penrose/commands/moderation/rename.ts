import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Command to rename a player via an alias.
 * Allows setting a custom name that can optionally be reflected in the overhead nameTag.
 */
export const renameCommand: Command = {
    name: "rename",
    description: "Assigns an alias to a player. Use --ui to show it above their head.",
    usage: "{prefix}rename <player> <newName> [--ui | -u] [--reset]",
    examples: ["{prefix}rename Steve CaptainSteve --ui", "{prefix}rename Steve OrdinarySteve", "{prefix}rename Steve --reset"],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/items/name_tag.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Rename Player",
        description:
            "Assign an alias to a player to change their identity in chat and optionally overhead.\n\n" +
            "§7• §fSet Alias§7: Assign a new display name to a target player.\n" +
            "§7• §fReset Name§7: Remove an active alias and restore the player's original name.\n\n" +
            "§7Notes:\n" +
            "§7• §fUI Toggle§7: If enabled, the alias will be reflected in the player's overhead nametag.\n" +
            "§7• §fChat Integration§7: Aliases are prioritized over original names in all Paradox chat channels.\n" +
            "§7• Only Level 4 administrators can modify player identities.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Alias",
                description: "Give a player a new name.",
                requiredFields: ["target", "alias"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
            {
                name: "Reset Name",
                command: ["--reset"],
                description: "Remove any active alias from the player.",
                requiredFields: ["target"],
                generateModalForm: true,
                icon: "textures/ui/wysiwyg_reset.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Target Player:",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["target"],
            },
            {
                name: "\nEnter New Name:",
                type: "text",
                placeholder: "The alias to apply",
                requiredFields: ["alias"],
            },
            {
                name: "\nShow in nameTag (Overhead):",
                arg: "--ui",
                type: "toggle",
                requiredFields: ["alias"],
            },
        ],
    },
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const sender = message.sender;

        if (args.length < 1) {
            sender.sendMessage("§o§c[Paradox] Usage: !rename <player> <newName> [--ui]");
            return;
        }

        const isReset = args.includes("--reset");
        const showUI = args.includes("--ui") || args.includes("-u");

        // Filter out flags to get player and new name
        const cleanArgs = args.filter((a) => !["--ui", "-u", "--reset"].includes(a.toLowerCase()));

        if (cleanArgs.length < 1) {
            sender.sendMessage("§o§c[Paradox] Please specify a player.");
            return;
        }

        const targetName = cleanArgs[0].replace(/["@]/g, "");
        const target = PlayerCache.getPlayerByName(targetName);

        if (!target || !target.isValid) {
            sender.sendMessage(`§o§c[Paradox] Player "${targetName}" not found.`);
            return;
        }

        if (isReset) {
            target.setDynamicProperty("paradoxAlias", undefined);
            target.setDynamicProperty("showAliasInUI", false);

            // Force reset the nameTag back to original logic
            const rank = (target.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
            system.run(() => {
                target.nameTag = `${rank}§r ${target.name}`;
            });

            sender.sendMessage(`§2[§7Paradox§2]§o§7 Identity reset for ${target.name}.`);
            return;
        }

        const newAlias = cleanArgs.slice(1).join(" ");
        if (!newAlias) {
            sender.sendMessage("§o§c[Paradox] Please provide a new name.");
            return;
        }

        // Store the alias and UI preference
        target.setDynamicProperty("paradoxAlias", newAlias);
        target.setDynamicProperty("showAliasInUI", showUI);

        if (showUI) {
            const rank = (target.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
            system.run(() => {
                target.nameTag = `${rank}§r ${newAlias}`;
                target.teleport(target.location, { dimension: target.dimension }); // Force sync
            });
        } else {
            // If UI is not opted in, ensure the nameTag shows their real name but with current rank
            const rank = (target.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
            system.run(() => {
                target.nameTag = `${rank}§r ${target.name}`;
            });
        }

        sender.sendMessage(`§2[§7Paradox§2]§o§7 ${target.name} is now known as "${newAlias}" (UI: ${showUI ? "Enabled" : "Disabled"}).`);
    },
};

import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

/**
 * Safely updates a player's overhead nameTag taking ranks, global rank settings, and active aliases into account.
 *
 * @param {Player} player - Target player object.
 */
function refreshNameTag(player: Player): void {
    const isRankDisabled = (world.getDynamicProperty("globalRankDisabled") as boolean | undefined) ?? false;
    const rank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
    const showUI = (player.getDynamicProperty("showAliasInUI") as boolean | undefined) ?? false;
    const alias = player.getDynamicProperty("paradoxAlias") as string | undefined;

    const activeName = showUI && alias ? alias : player.name;
    const nameTagText = isRankDisabled ? activeName : `${rank}§r ${activeName}`;

    system.run(() => {
        player.nameTag = nameTagText;

        // Fetch transform from cache to force sync safely
        const transform = PlayerLocationCache.getTransform(player);
        const location = transform?.location ?? player.location;
        const dimension = transform?.dimension ?? player.dimension;

        player.teleport(location, { dimension }); // Force sync
    });
}

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

            refreshNameTag(target);

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

        refreshNameTag(target);

        sender.sendMessage(`§2[§7Paradox§2]§o§7 ${target.name} is now known as "${newAlias}" (UI: ${showUI ? "Enabled" : "Disabled"}).`);
    },
};

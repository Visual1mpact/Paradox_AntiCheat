import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { PlayerLocationCache } from "../../classes/cache/player-location-cache";

const VALID_FLAGS = new Set(["-t", "--target", "-r", "--rank", "--reset", "-d", "-e"]);

interface RankCommandArgs {
    playerName: string;
    rank: string;
    reset: boolean;
}

/**
 * Updates the player's nameTag based on their chat rank, dynamic alias settings, and the global rank setting.
 *
 * If ranks are disabled globally, the nameTag will only show the player's display name.
 * Otherwise, it will prepend the player's rank (or default rank).
 * A teleport to the player's current location is issued to force a client sync for the nameTag.
 *
 * @param {Player} player - The player whose nameTag should be updated.
 */
function updateNameTag(player: Player): void {
    const isRankDisabled = (world.getDynamicProperty("globalRankDisabled") as boolean | undefined) ?? false;
    const rank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";

    const showUI = (player.getDynamicProperty("showAliasInUI") as boolean | undefined) ?? false;
    const alias = player.getDynamicProperty("paradoxAlias") as string | undefined;
    const displayName = showUI && alias ? alias : player.name;

    player.nameTag = isRankDisabled ? displayName : `${rank}§r ${displayName}`;

    const transform = PlayerLocationCache.getTransform(player);
    const location = transform?.location ?? player.location;
    const dimension = transform?.dimension ?? player.dimension;

    player.teleport(location, { dimension }); // Force client sync
}

/**
 * Toggles global rank functionality (enable/disable) for all online players.
 *
 * @param {ChatSendBeforeEvent} message - The message object context.
 * @param {number} senderClearance - The clearance level of the command sender.
 * @param {boolean} disable - True to disable ranks globally, false to enable.
 */
function toggleGlobalRanks(message: ChatSendBeforeEvent, senderClearance: number, disable: boolean): void {
    if (senderClearance < 4) {
        message.sender.sendMessage(`§o§c[Paradox] You do not have permission to perform this action.`);
        return;
    }

    world.setDynamicProperty("globalRankDisabled", disable);

    for (const player of PlayerCache.getPlayers()) {
        updateNameTag(player);
    }

    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Ranks have been ${disable ? "disabled" : "enabled"} globally.`);
}

/**
 * Captures and returns a multi-word argument string from the provided array of arguments.
 * Continues to concatenate words until a valid flag or end-of-array is reached.
 *
 * @param {string[]} args - The array of arguments to parse from.
 * @returns {string} The captured multi-word string value cleaned of quotes and selectors.
 */
function captureMultiWordArgument(args: string[]): string {
    let result = "";
    while (args.length > 0 && args[0] !== undefined && !VALID_FLAGS.has(args[0])) {
        result += (result ? " " : "") + args.shift();
    }
    return result.replace(/["@]/g, "");
}

/**
 * Parses raw string flags and arguments into a structured RankCommandArgs object.
 *
 * @param {string[]} args - Raw argument array.
 * @returns {RankCommandArgs} Structured parameters payload.
 */
function parseRankArguments(args: string[]): RankCommandArgs {
    const parsed: RankCommandArgs = { playerName: "", rank: "", reset: false };

    while (args.length > 0) {
        const flag = args.shift();
        switch (flag) {
            case "-t":
            case "--target":
                parsed.playerName = captureMultiWordArgument(args);
                break;
            case "-r":
            case "--rank":
                parsed.rank = captureMultiWordArgument(args);
                break;
            case "--reset":
                parsed.reset = true;
                break;
        }
    }

    return parsed;
}

/**
 * Resets a target player's chat rank to default and synchronizes visual tags.
 *
 * @param {Player} sender - Command executing sender.
 * @param {Player} target - Subject player undergoing rank reset.
 */
function handleRankReset(sender: Player, target: Player): void {
    target.setDynamicProperty("chatRank", undefined);
    updateNameTag(target);

    sender.sendMessage(`§2[§7Paradox§2]§o§7 Chat rank for player "${target.name}§7" has been reset.`);
    target.sendMessage(`§2[§7Paradox§2]§o§7 Your chat rank has been reset by "${sender.name}§7".`);
}

/**
 * Updates a target player's chat rank string property and synchronizes visual tags.
 *
 * @param {Player} sender - Command executing sender.
 * @param {Player} target - Subject player undergoing rank change.
 * @param {string} rank - New custom rank string to apply.
 */
function handleRankUpdate(sender: Player, target: Player, rank: string): void {
    target.setDynamicProperty("chatRank", rank);
    updateNameTag(target);

    sender.sendMessage(`§2[§7Paradox§2]§o§7 Chat rank for player "${target.name}§7" has been set to ${rank}§7.`);
    target.sendMessage(`§2[§7Paradox§2]§o§7 Your chat rank has been set to ${rank}§7 by "${sender.name}§7".`);
}

/**
 * Represents the setrank command.
 */
export const setRankCommand: Command = {
    name: "setrank",
    description: "Sets or resets the chat rank for a player, or toggles rank functionality globally.",
    usage: "{prefix}setrank [ -t | --target <player> ] [ -r | --rank <rank> ] [ --reset ] [ -d | -e ]",
    examples: [`{prefix}setrank -t PlayerName -r [Admin]`, `{prefix}setrank -r [Member] -t PlayerName`, `{prefix}setrank -t PlayerName --reset`, `{prefix}setrank -d`, `{prefix}setrank -e`],
    icon: "textures/items/book_portfolio.png",
    securityClearance: 3,
    guiInstructions: {
        formType: "ActionFormData",
        title: "Set or Reset Rank",
        description: "Manage chat ranks for players.\n\n" + "§7• Set a player's rank.\n" + "§7• Reset a player's rank.\n" + "§7• Enable or disable ranks globally (admin only).\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Rank",
                icon: "textures/ui/confirm.png",
                description: "Set a player's chat rank.",
                securityClearance: 3,
                requiredFields: ["PlayerName", "Rank"],
                generateModalForm: true,
            },
            {
                name: "Reset Rank",
                icon: "textures/ui/backup_replace.png",
                description: "Reset a player's chat rank.",
                securityClearance: 3,
                command: ["--reset"],
                requiredFields: ["PlayerName"],
                generateModalForm: true,
            },
            {
                name: "Disable Ranks Globally",
                icon: "textures/ui/Ping_Offline_Red.png",
                description: "Disable all chat ranks globally (admin only).",
                securityClearance: 4,
                command: ["-d"],
                generateModalForm: false,
            },
            {
                name: "Enable Ranks Globally",
                icon: "textures/ui/player_online_icon.png",
                description: "Enable chat ranks globally (admin only).",
                securityClearance: 4,
                command: ["-e"],
                generateModalForm: false,
            },
        ],
        dynamicFields: [
            {
                type: "dropdown",
                sourceType: "players",
                name: "\nSelect Player Name:",
                arg: "--target",
                requiredFields: ["PlayerName"],
            },
            {
                type: "text",
                name: "\nInput Rank Here:",
                placeholder: "Rank",
                arg: "--rank",
                requiredFields: ["Rank"],
            },
        ],
    },
    category: "Utility",

    /**
     * Executes the setrank command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - The message object context.
     * @param {string[] | undefined} args - The command argument list.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args: string[] | undefined) => {
        if (!message || !args) return;

        const sender = message.sender;
        const senderClearance = (sender.getDynamicProperty("securityClearance") as number) ?? 1;

        if (args.includes("-d")) {
            toggleGlobalRanks(message, senderClearance, true);
            return;
        }
        if (args.includes("-e")) {
            toggleGlobalRanks(message, senderClearance, false);
            return;
        }

        const isRankDisabled = (world.getDynamicProperty("globalRankDisabled") as boolean | undefined) ?? false;
        if (isRankDisabled && senderClearance < 4) {
            sender.sendMessage(`§o§c[Paradox] Global rank management is currently disabled.`);
            return;
        }

        const { playerName, rank, reset } = parseRankArguments([...args]);

        if (!playerName && !reset) {
            const prefix = (world.getDynamicProperty("__prefix") as string | undefined) ?? ":";
            sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}§7setrank -t <player> [-r <rank> | --reset]`);
            return;
        }

        const targetPlayer = PlayerCache.getPlayerByName(playerName);
        if (!targetPlayer) {
            sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" not found.`);
            return;
        }

        if (reset) {
            handleRankReset(sender, targetPlayer);
            return;
        }

        if (!rank) {
            const prefix = (world.getDynamicProperty("__prefix") as string | undefined) ?? ":";
            sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}§7setrank -t <player> -r <rank> | --reset`);
            return;
        }

        handleRankUpdate(sender, targetPlayer, rank);
    },
};

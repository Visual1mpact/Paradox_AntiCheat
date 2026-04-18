import { ChatSendBeforeEvent, Player, system, ItemStack } from "@minecraft/server";
import { verses } from "../../data/verses";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";
import { EventCoordinator } from "../../classes/event-coordinator";

// ===== CONFIG =====
const INTERVAL_TICKS = 30 * 60 * 20; // 30 minutes
const MAX_DIAMONDS_PER_DAY = 10;

/**
 * Stores per-player state including queued verses and last day served.
 */
const playerData = new Map<string, { verseQueue: string[]; lastDay: string }>();

/**
 * Cleans up player data when they leave the server.
 */
EventCoordinator.subscribeAfter("playerLeave", (event) => {
    playerData.delete(event.playerId);
});

/**
 * Shuffles an array and returns a new shuffled array.
 * @param array - Array of strings to shuffle
 * @returns New shuffled array
 */
function shuffleArray(array: string[]) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/**
 * Wraps verse text into multiple lines for on-screen display.
 * @param text - Full verse string including reference
 * @param maxLineLength - Maximum number of characters per line
 * @returns Wrapped verse string with reference on first line
 */
function wrapVerseText(text: string, maxLineLength = 42): string {
    const [reference, verseText] = text.split(" — ");
    if (!verseText) return text;

    const words = verseText.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        if ((currentLine + word).length > maxLineLength) {
            lines.push(currentLine.trim());
            currentLine = "";
        }
        currentLine += word + " ";
    }

    if (currentLine.trim().length > 0) {
        lines.push(currentLine.trim());
    }

    return `${reference}\n${lines.join("\n")}`;
}

/**
 * Resets the per-day scripture reward counter for a player.
 * @param player - Player whose counter is reset
 */
function resetDailyCounters(player: Player) {
    player.setDynamicProperty("scriptureRewardsToday", 0);
}

/**
 * Sends a scripture verse to a player, displaying on-screen title and optionally granting rewards.
 * @param player - Player to broadcast the verse to
 */
function broadcastScriptureToPlayer(player: Player) {
    const today = new Date().toDateString();

    if (!playerData.has(player.id)) {
        playerData.set(player.id, { verseQueue: shuffleArray([...verses]), lastDay: today });
    }

    const data = playerData.get(player.id)!;

    if (data.lastDay !== today) {
        resetDailyCounters(player);
        data.lastDay = today;
    }

    if (!data.verseQueue.length) data.verseQueue = shuffleArray([...verses]);

    const verse = data.verseQueue.pop()!;
    const wrapped = wrapVerseText(verse);
    const [reference, ...lines] = wrapped.split("\n");

    player.onScreenDisplay.setTitle(reference, {
        subtitle: lines.join("\n"),
        fadeInDuration: 7,
        stayDuration: 120,
        fadeOutDuration: 7,
    });
    player.playSound("random.levelup", { volume: 1, pitch: 1 });

    let rewardsGivenToday = (player.getDynamicProperty("scriptureRewardsToday") as number) || 0;

    if (rewardsGivenToday < MAX_DIAMONDS_PER_DAY) {
        const remaining = MAX_DIAMONDS_PER_DAY - rewardsGivenToday;
        const amountToGive = Math.min(1, remaining);

        const rewardItem = Math.random() < 0.75 ? "minecraft:diamond" : "minecraft:netherite_ingot";
        player?.getComponent("inventory")?.container.addItem(new ItemStack(rewardItem, amountToGive));
        player.setDynamicProperty("scriptureRewardsToday", rewardsGivenToday + amountToGive);
    }
}

/**
 * Interval loop to broadcast scripture to all players who have scripture enabled.
 */
system.runInterval(() => {
    for (const player of PlayerCache.getPlayers()) {
        const enabled = player.getDynamicProperty("scriptureEnabled");
        if (enabled === true) {
            broadcastScriptureToPlayer(player);
        }
    }
}, INTERVAL_TICKS);

/**
 * Command definition to enable or disable scripture mode and daily rewards for a player.
 */
export const scriptureCommand: Command = {
    name: "scripture",
    description: "Enable or disable scripture & daily diamond for a player.",
    usage: "{prefix}scripture -t <player> [-e | -d]",
    examples: [`{prefix}scripture -t PlayerName -e`, `{prefix}scripture -t PlayerName -d`],
    category: "Utility",
    securityClearance: 3,
    icon: "textures/items/book_enchanted",
    guiInstructions: {
        formType: "ActionFormData",
        commandOrder: "arg-command",
        title: "Scripture",
        description:
            "Manage automated scripture verses and daily rewards.\n\n" +
            "§7Scripture Mode:\n" +
            "§7• §fEnable Scripture§7: Player receives a scripture verse every 30 minutes.\n" +
            "§7• §fDisable Scripture§7: Stops verses and daily rewards for the player.\n\n" +
            "§7Rewards:\n" +
            "§7• Players receive §f1 reward§7 per verse.\n" +
            "§7• Rewards are usually §fdiamonds§7, with a small chance of §fnetherite ingots§7.\n" +
            "§7• Maximum of §f10 rewards per day§7 per player.\n\n" +
            "§7Display:\n" +
            "§7• Scripture reference appears as the §ftitle§7.\n" +
            "§7• Verse text appears as the §fsubtitle§7.\n" +
            "§7• Verses are automatically shuffled to avoid repetition.\n\n" +
            "§7Changes apply immediately and persist through server restarts.\n\n",
        actions: [
            {
                name: "Apply Changes",
                description: "Enable or Disable Scripture mode for the selected player.",
                icon: "textures/ui/confirm.png",
                generateModalForm: true,
                requiredFields: ["scriptureAction"],
            },
        ],
        dynamicFields: [
            { name: "Player", type: "dropdown", sourceType: "players", arg: "-t", requiredFields: ["scriptureAction"] },
            { name: "Enable Scripture", type: "toggle", arg: "-e", requiredFields: ["scriptureAction"] },
            { name: "Disable Scripture", type: "toggle", arg: "-d", requiredFields: ["scriptureAction"] },
        ],
    },
    /**
     * Executes the scripture command to enable/disable a player’s scripture mode.
     * @param message - Optional chat event for sender feedback
     * @param args - Array of command arguments and flags
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const validFlags = new Set(["-t", "--target", "-e", "-d"]);
        let playerName = "";
        let enable = false;
        let disable = false;

        function captureMultiWordArgument(args: string[]): string {
            let result = "";
            while (args.length > 0 && !validFlags.has(args[0])) {
                result += (result ? " " : "") + args.shift();
            }
            return result.replace(/["@]/g, "");
        }

        while (args.length > 0) {
            const flag = args.shift();
            switch (flag) {
                case "-t":
                case "--target":
                    playerName = captureMultiWordArgument(args);
                    break;
                case "-e":
                    enable = true;
                    break;
                case "-d":
                    disable = true;
                    break;
            }
        }

        if (!playerName) {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${message.sender.getDynamicProperty("__prefix") ?? "!"}scripture -t <player> [-e | -d]`);
            return;
        }

        const player = PlayerCache.getPlayerByName(playerName);
        if (!player) {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" not found.`);
            return;
        }

        if (enable && disable) {
            message.sender.sendMessage(`§o§c[Paradox] Cannot enable and disable at the same time.`);
            return;
        }

        const currentState = player.getDynamicProperty("scriptureEnabled");
        const isEnabled = currentState === undefined || currentState === true;

        if (enable) {
            if (isEnabled) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode is already §aenabled§7 for ${player.name}.`);
            } else {
                player.setDynamicProperty("scriptureEnabled", true);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §aenabled§7 for ${player.name}.`);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §aenabled§7 by ${message.sender.name}.`);
            }
        } else if (disable) {
            if (!isEnabled) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode is already §4disabled§7 for ${player.name}.`);
            } else {
                player.setDynamicProperty("scriptureEnabled", false);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §4disabled§7 for ${player.name}.`);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §4disabled§7 by ${message.sender.name}.`);
            }
        } else {
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Specify -e to §aenable§7 or -d to §4disable§7.`);
        }
    },
};

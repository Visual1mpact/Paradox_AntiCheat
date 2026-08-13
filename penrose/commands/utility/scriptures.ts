import { ChatSendBeforeEvent, Player, system, ItemStack, world } from "@minecraft/server";
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
 * Helper to check whether Scripture mode is globally enabled by admins.
 * Defaults to false until an admin with level 3 or 4 clearance enables it globally.
 */
function isGlobalScriptureEnabled(): boolean {
    const globalState = world.getDynamicProperty("globalScriptureEnabled");
    return globalState === true;
}

/**
 * Shuffles an array and returns a new shuffled array.
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
 */
function resetDailyCounters(player: Player) {
    player.setDynamicProperty("scriptureRewardsToday", 0);
}

/**
 * Sends a scripture verse to a player, displaying on-screen title and optionally granting rewards.
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
 * Interval loop to broadcast scripture to players who have it enabled,
 * only if Scripture mode is globally enabled by an admin.
 */
system.runInterval(() => {
    if (!isGlobalScriptureEnabled()) return;

    for (const player of PlayerCache.getPlayers()) {
        const enabled = player.getDynamicProperty("scriptureEnabled");
        if (enabled === true) {
            broadcastScriptureToPlayer(player);
        }
    }
}, INTERVAL_TICKS);

/**
 * Command definition to enable or disable scripture mode for self or globally.
 */
export const scriptureCommand: Command = {
    name: "scripture",
    description: "Enable or disable scripture & daily rewards for yourself or globally.",
    usage: "{prefix}scripture [-e | -d] | {prefix}scripture [-g | --global] [-e | -d] | {prefix}scripture [-t | --target <player>] [-e | -d]",
    examples: [`{prefix}scripture -e`, `{prefix}scripture -d`, `{prefix}scripture -g -e`, `{prefix}scripture -g -d`, `{prefix}scripture -t PlayerName -e`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/book_enchanted",
    guiInstructions: {
        formType: "ActionFormData",
        commandOrder: "arg-command",
        title: "Scripture",
        description:
            "Manage automated scripture verses and daily rewards.\n\n" +
            "§7Personal Settings:\n" +
            "§7• Enable or disable scripture delivery for yourself.\n\n" +
            "§7Admin Management (Clearance Level 3+):\n" +
            "§7• §fGlobal Toggle§7: Enable or disable scripture feature globally.\n" +
            "§7• §fTarget Player§7: Manage scripture status for a specific player.\n\n" +
            "§7Rewards:\n" +
            "§7• Maximum of §f10 rewards per day§7 per player.\n\n",
        actions: [
            {
                name: "Toggle Scripture (Self)",
                description: "Enable or disable scripture verses for yourself.",
                icon: "textures/ui/confirm.png",
                generateModalForm: true,
                requiredFields: ["scriptureAction"],
            },
            {
                name: "Toggle Scripture Globally",
                description: "Enable or disable scripture feature globally (Admin level 3+).",
                securityClearance: 3,
                icon: "textures/ui/world_glyph.png",
                command: ["-g"],
                generateModalForm: true,
                requiredFields: ["scriptureAction"],
            },
            {
                name: "Toggle Scripture for Player",
                description: "Enable or disable scripture mode for a target player (Admin level 3+).",
                securityClearance: 3,
                icon: "textures/ui/editIcon.png",
                requiredFields: ["TargetPlayer", "scriptureAction"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            { name: "Enable Scripture", type: "toggle", arg: "-e", requiredFields: ["scriptureAction"] },
            { name: "Disable Scripture", type: "toggle", arg: "-d", requiredFields: ["scriptureAction"] },
            { name: "Target Player", type: "dropdown", sourceType: "players", arg: "-t", requiredFields: ["TargetPlayer"] },
        ],
    },
    /**
     * Executes the scripture command.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message || !message.sender) return;
        const player = message.sender;
        const senderClearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;

        const validFlags = new Set(["-t", "--target", "-g", "--global", "-e", "-d"]);
        let targetName = "";
        let isGlobal = false;
        let enable = false;
        let disable = false;

        function captureMultiWordArgument(argsCopy: string[]): string {
            let result = "";
            while (argsCopy.length > 0 && !validFlags.has(argsCopy[0])) {
                result += (result ? " " : "") + argsCopy.shift();
            }
            return result.replace(/["@]/g, "");
        }

        const argsCopy = [...args];
        while (argsCopy.length > 0) {
            const flag = argsCopy.shift();
            switch (flag) {
                case "-g":
                case "--global":
                    isGlobal = true;
                    break;
                case "-t":
                case "--target":
                    targetName = captureMultiWordArgument(argsCopy);
                    break;
                case "-e":
                    enable = true;
                    break;
                case "-d":
                    disable = true;
                    break;
            }
        }

        if (enable && disable) {
            player.sendMessage(`§o§c[Paradox] Cannot specify enable (-e) and disable (-d) at the same time.`);
            return;
        }

        if (!enable && !disable) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Specify §a-e§7 to enable or §4-d§7 to disable.`);
            return;
        }

        // --- GLOBAL ADMIN ROUTE ---
        if (isGlobal) {
            if (senderClearance < 3) {
                player.sendMessage(`§o§c[Paradox] You do not have permission to toggle scripture globally (Level 3 clearance required).`);
                return;
            }

            if (enable) {
                world.setDynamicProperty("globalScriptureEnabled", true);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode has been §aglobally enabled§7.`);
            } else {
                world.setDynamicProperty("globalScriptureEnabled", false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode has been §4globally disabled§7.`);
            }
            return;
        }

        // --- TARGET PLAYER ADMIN ROUTE ---
        if (targetName) {
            if (senderClearance < 3) {
                player.sendMessage(`§o§c[Paradox] You do not have permission to modify scripture mode for other players.`);
                return;
            }

            if (enable && !isGlobalScriptureEnabled()) {
                player.sendMessage(`§o§c[Paradox] Cannot enable scripture for ${targetName} because scripture mode is globally disabled.`);
                return;
            }

            const targetPlayer = PlayerCache.getPlayerByName(targetName);
            if (!targetPlayer) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Player "${targetName}" not found.`);
                return;
            }

            if (enable) {
                targetPlayer.setDynamicProperty("scriptureEnabled", true);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §aenabled§7 for ${targetPlayer.name}.`);
                targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §aenabled§7 by admin ${player.name}.`);
            } else {
                targetPlayer.setDynamicProperty("scriptureEnabled", false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §4disabled§7 for ${targetPlayer.name}.`);
                targetPlayer.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §4disabled§7 by admin ${player.name}.`);
            }
            return;
        }

        // --- PERSONAL PLAYER ROUTE ---
        if (!isGlobalScriptureEnabled()) {
            player.sendMessage(`§o§c[Paradox] Scripture mode is currently disabled globally by an administrator.`);
            return;
        }

        const currentState = player.getDynamicProperty("scriptureEnabled");

        if (enable) {
            if (currentState === true) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode is already §aenabled§7 for you.`);
            } else {
                player.setDynamicProperty("scriptureEnabled", true);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §aenabled§7.`);
            }
        } else if (disable) {
            if (currentState === false || currentState === undefined) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode is already §4disabled§7 for you.`);
            } else {
                player.setDynamicProperty("scriptureEnabled", false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Scripture mode §4disabled§7.`);
            }
        }
    },
};

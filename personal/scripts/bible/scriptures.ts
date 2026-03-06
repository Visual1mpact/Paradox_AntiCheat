import { ChatSendBeforeEvent, Player, world, system, ItemStack } from "@minecraft/server";
import { verses } from "../bible/verses";
import { Command } from "../../../penrose/classes/command-handler";
import { PlayerCache } from "penrose/classes/player-cache";

// ===== CONFIG =====
const INTERVAL_TICKS = 30 * 60 * 20; // 30 minutes
const MAX_DIAMONDS_PER_DAY = 10;

// ===== PER-PLAYER STATE =====
const playerData = new Map<string, { verseQueue: string[]; lastDay: string }>();

world.afterEvents.playerLeave.subscribe((event) => {
    playerData.delete(event.playerId);
});

// ===== SHUFFLE HELPER =====
function shuffleArray(array: string[]) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ===== WRAPPER HELPER =====
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

// ===== RESET DAILY COUNTER =====
function resetDailyCounters(player: Player) {
    player.setDynamicProperty("scriptureRewardsToday", 0);
}

// ===== BROADCAST SCRIPTURE TO PLAYER =====
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

        // 75% Diamond, 25% Netherite
        const rewardItem = Math.random() < 0.75 ? "minecraft:diamond" : "minecraft:netherite_ingot";

        player?.getComponent("inventory")?.container.addItem(new ItemStack(rewardItem, amountToGive));

        player.setDynamicProperty("scriptureRewardsToday", rewardsGivenToday + amountToGive);
    }
}

// ===== INTERVAL LOOP =====
system.runInterval(() => {
    for (const player of PlayerCache.getPlayers()) {
        // Treat undefined as enabled by default
        const enabled = player.getDynamicProperty("scriptureEnabled");
        if (enabled === undefined || enabled === true) {
            broadcastScriptureToPlayer(player);
        }
    }
}, INTERVAL_TICKS);

// ===== COMMAND =====
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
        description: "Select a player and choose whether to Enable or Disable Scripture mode.\n\n",
        actions: [
            {
                name: "Apply Changes",
                description: "Enable or Disable Scripture mode for the selected player.",
                generateModalForm: true,
                requiredFields: ["scriptureAction"],
            },
        ],
        dynamicFields: [
            {
                name: "Player",
                type: "dropdown",
                sourceType: "players",
                arg: "-t",
                requiredFields: ["scriptureAction"],
            },
            {
                name: "Enable Scripture",
                type: "toggle",
                arg: "-e",
                requiredFields: ["scriptureAction"],
            },
            {
                name: "Disable Scripture",
                type: "toggle",
                arg: "-d",
                requiredFields: ["scriptureAction"],
            },
        ],
    },

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
            message.sender.sendMessage(`§2[Scripture]§7 Usage: ${message.sender.getDynamicProperty("__prefix") ?? "!"}scripture -t <player> [-e | -d]`);
            return;
        }

        const player = PlayerCache.getPlayerByName(playerName);
        if (!player) {
            message.sender.sendMessage(`§c[Scripture] Player "${playerName}" not found.`);
            return;
        }

        if (enable && disable) {
            message.sender.sendMessage(`§c[Scripture] Cannot enable and disable at the same time.`);
            return;
        }

        // Determine current state, treating undefined as enabled
        const currentState = player.getDynamicProperty("scriptureEnabled");
        const isEnabled = currentState === undefined || currentState === true;

        if (enable) {
            if (isEnabled) {
                message.sender.sendMessage(`§2[Scripture]§7 Scripture mode is already ENABLED for ${player.name}.`);
            } else {
                player.setDynamicProperty("scriptureEnabled", true);
                message.sender.sendMessage(`§2[Scripture]§7 Scripture mode ENABLED for ${player.name}.`);
                player.sendMessage(`§2[Scripture]§7 Scripture mode ENABLED by ${message.sender.name}.`);
            }
        } else if (disable) {
            if (!isEnabled) {
                message.sender.sendMessage(`§2[Scripture]§7 Scripture mode is already DISABLED for ${player.name}.`);
            } else {
                player.setDynamicProperty("scriptureEnabled", false);
                message.sender.sendMessage(`§2[Scripture]§7 Scripture mode DISABLED for ${player.name}.`);
                player.sendMessage(`§2[Scripture]§7 Scripture mode DISABLED by ${message.sender.name}.`);
            }
        } else {
            message.sender.sendMessage(`§2[Scripture]§7 Specify -e to enable or -d to disable.`);
        }
    },
};

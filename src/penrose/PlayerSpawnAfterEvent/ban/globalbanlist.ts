import { world, PlayerSpawnAfterEvent } from "@minecraft/server";
import { banplayer } from "../../../data/globalban.js";
import { banMessage } from "../../../util.js";

// Create a Set to store the names of globally banned players
const bannedPlayers = new Set(banplayer.map((player) => player.name));

function banHammerTime(object: PlayerSpawnAfterEvent) {
    /**
     * We only want to execute this when it's a player's initial spawn
     */
    if (!object.initialSpawn) {
        return;
    }

    const player = object.player;

    // Check if the player who is joining is on the global ban list, and kick them out if they are
    if (bannedPlayers.has(player.nameTag)) {
        const playerTags = player.getTags();
        if (!playerTags.includes("By:Paradox Anticheat")) {
            player.addTag("By:Paradox Anticheat");
        }
        if (!playerTags.includes("Reason:You are globally banned from Paradox!")) {
            player.addTag("Reason:You are globally banned from Paradox!");
        }
        banMessage(player);
    }
}

const GlobalBanList = () => {
    world.afterEvents.playerSpawn.subscribe(banHammerTime);
};

export { GlobalBanList };

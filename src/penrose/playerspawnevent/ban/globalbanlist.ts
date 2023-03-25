import { world, PlayerSpawnEvent } from "@minecraft/server";
import { banplayer } from "../../../data/globalban.js";
import { banMessage } from "../../../util.js";

function banHammerTime(object: PlayerSpawnEvent) {
    /**
     * We only want to execute this when it's a players initial spawn
     */
    if (!object.initialSpawn) {
        return;
    }

    const player = object.player;

    // Check global ban list and if the player who is joining is on the server then kick them out
    for (let i = 0; i < banplayer.length; i++) {
        const code = banplayer[i];
        if (code.name === player.nameTag) {
            const playerTags = player.getTags();
            if (!playerTags.includes("By:Paradox Anticheat")) {
                player.addTag("By:Paradox Anticheat");
            }
            if (!playerTags.includes("Reason:You are globally banned from Paradox!")) {
                player.addTag("Reason:You are globally banned from Paradox!");
            }
            banMessage(player);
            break;
        }
    }
}

const GlobalBanList = () => {
    world.events.playerSpawn.subscribe(banHammerTime);
};

export { GlobalBanList };

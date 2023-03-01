import { world, PlayerSpawnEvent, Player } from "@minecraft/server";
import { banplayer } from "../../../data/globalban.js";
import { banMessage } from "../../../util.js";

const World = world;

async function banHammerTime(object: PlayerSpawnEvent) {
    /**
     * We only want to execute this when it's a players initial spawn
     */
    let player: Player;
    if (object.initialSpawn === true) {
        player = object.player;
    } else {
        return;
    }

    // Check global ban list and if the player who is joining is on the server then kick them out
    if (banplayer.some((code) => JSON.stringify(code) === JSON.stringify({ name: player.nameTag }))) {
        if (!player.hasTag("By:Paradox Anticheat")) {
            // if they are not tagged then we do that here before we ban
            player.addTag("By:Paradox Anticheat");
        }
        if (!player.hasTag("Reason:You are globally banned from Paradox!")) {
            // if they are not tagged then we do that here before we ban
            player.addTag("Reason:You are globally banned from Paradox!");
        }
        banMessage(player);
    }
}

const GlobalBanList = () => {
    World.events.playerSpawn.subscribe(banHammerTime);
};

export { GlobalBanList };

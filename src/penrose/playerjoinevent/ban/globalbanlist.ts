import { Player, world } from "mojang-minecraft";
import { banplayer } from "../../../data/globalban.js";
import { banMessage } from "../../../util.js";

const World = world;

const tickEventCallback = World.events.tick;

let check = false;

function banHammerTime(player: Player, callback: any) {
    try {
        // Loop until player is detected in the world
        player.runCommand(`testfor @s`);
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
        check = true;
    } catch (error) {}
    if (check) {
        check = false;
        tickEventCallback.unsubscribe(callback);
        return;
    }
}

const GlobalBanList = () => {
    World.events.playerJoin.subscribe((loaded) => {
        // Get the name of the player who is joining
        let player = loaded.player;
        // Subscribe tick event to the time function
        let callback: any;
        tickEventCallback.subscribe((callback = () => banHammerTime(player, callback)));
    });
};

export { GlobalBanList };

import * as Minecraft from "mojang-minecraft";
import { banplayer } from "../../../data/globalban.js";
import { banMessage, disabler } from "../../../util.js";

const World = Minecraft.world;

const tickEventCallback = World.events.tick;

function banHammerTime(player) {
    try {
        // Loop until player is detected in the world
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}"]`);
        // Check global ban list and if the player who is joining is on the server then kick them out
        if (banplayer.some(code => JSON.stringify(code) === JSON.stringify({ name: player.nameTag }))) {
            if (!player.hasTag('By:Paradox Anticheat')) {
                // if they are not tagged then we do that here before we ban
                player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox Anticheat"`);
            }
            if (!player.hasTag('Reason:You are Paradox Anticheat global banned!')) {
                // if they are not tagged then we do that here before we ban
                player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:You are Paradox Anticheat global banned!"`);
            }
            banMessage(player);
        }
        player.check = true;
    } catch (error) {}
    if (player.check) {
        player.check = false;
        tickEventCallback.unsubscribe(banHammerTime);
        return;
    }
}

const GlobalBanList = () => {
    World.events.playerJoin.subscribe(loaded => {
        // Get the name of the player who is joining
        let player = loaded.player;
        // Subscribe tick event to the time function
        tickEventCallback.subscribe(() => banHammerTime(player));
    });
};

export { GlobalBanList };
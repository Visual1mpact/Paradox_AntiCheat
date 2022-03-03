import * as Minecraft from "mojang-minecraft";
import { banplayer } from "../../../data/globalban.js";
import { banMessage, disabler } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const GlobalBanList = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // Check global ban list and if the player who is joining is on the server then kick them out
            if (banplayer.some(code => JSON.stringify(code) === JSON.stringify({ name: player.nameTag }))) {
                try {
                    // test if they have the tag first or global ban will fail if we attempt to tag with an existing tag
                    // if they are not tagged then we do that here before we ban
                    player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=!"By:Paradox Anticheat"]`);
                    player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox Anticheat"`);
                } catch (error) {}
                try {
                    // test if they have the tag first or global ban will fail if we attempt to tag with an existing tag
                    // if they are not tagged then we do that here before we ban
                    player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=!"Reason:You are Paradox Anticheat global banned!"]`);
                    player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:You are Paradox Anticheat global banned!"`);
                } catch (error2) {}
                banMessage(player);
            }
        }
    }, 40); // Executes every 2 seconds
};

export { GlobalBanList };
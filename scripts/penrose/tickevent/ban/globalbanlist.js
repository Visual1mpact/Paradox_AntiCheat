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
        }
    }, 40); // Executes every 2 seconds
};

export { GlobalBanList };
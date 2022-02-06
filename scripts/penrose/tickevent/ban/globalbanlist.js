import * as Minecraft from "mojang-minecraft";
import { banplayer } from "../../../data/globalban.js";
import { banMessage } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.World;
const Commands = Minecraft.Commands;

const GlobalBanList = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            // fix a disabler method
            player.nameTag = player.nameTag.replace("\"", "");
            player.nameTag = player.nameTag.replace("\\", "");

            // Check global ban list and if the player who is joining is on the server then kick them out
            if (banplayer.some(code => JSON.stringify(code) === JSON.stringify({ name: player.nameTag }))) {
                try {
                    // test if they have the tag first or global ban will fail if we attempt to tag with an existing tag
                    // if they are not tagged then we do that here before we ban
                    Commands.run(`testfor @a[name="${player.nameTag}",tag=!"By:Paradox Anticheat"]`, World.getDimension("overworld"));
                    Commands.run(`tag "${player.nameTag}" add "By:Paradox Anticheat"`, World.getDimension("overworld"));
                } catch (error) {}
                try {
                    // test if they have the tag first or global ban will fail if we attempt to tag with an existing tag
                    // if they are not tagged then we do that here before we ban
                    Commands.run(`testfor @a[name="${player.nameTag}",tag=!"Reason:You are Paradox Anticheat global banned!"]`, World.getDimension("overworld"));
                    Commands.run(`tag "${player.nameTag}" add "Reason:You are Paradox Anticheat global banned!"`, World.getDimension("overworld"));
                } catch (error2) {}
                banMessage(player);
            }
        }
    }, 40) //Executes every 2 seconds
}

export { GlobalBanList }
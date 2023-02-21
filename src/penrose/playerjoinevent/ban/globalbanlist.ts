import { Player, world, system } from "@minecraft/server";
import { banplayer } from "../../../data/globalban.js";
import { banMessage } from "../../../util.js";

const World = world;

let check = false;

function banHammerTime(player: Player, id: number) {
    try {
        // Loop until player is detected in the world
        player.runCommandAsync(`testfor @s`);
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
        system.clearRunSchedule(id);
        return;
    }
}

const GlobalBanList = () => {
    World.events.playerSpawn.subscribe((loaded) => {
        // Get the name of the player who is joining
        let player = loaded.player;
        /**
         * We store the identifier in a variable
         * to cancel the execution of this scheduled run
         * if needed to do so.
         */
        const banHammerTimeId = system.runSchedule(() => {
            banHammerTime(player, banHammerTimeId);
        });
    });
};

export { GlobalBanList };

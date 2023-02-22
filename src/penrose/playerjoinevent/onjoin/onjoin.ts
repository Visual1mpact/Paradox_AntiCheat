import { Player, world, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { onJoinData } from "../../../data/onjoindata.js";
import { getPrefix } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";

const World = world;

let check = false;

async function onJoinTime(player: Player, id: number) {
    // Get Dynamic Property
    let lockdownBoolean = World.getDynamicProperty("lockdown_b");
    if (lockdownBoolean === undefined) {
        lockdownBoolean = config.modules.lockDown.enabled;
    }
    // Get Dynamic Property
    let illegalItemsABoolean = World.getDynamicProperty("illegalitemsa_b");
    if (illegalItemsABoolean === undefined) {
        illegalItemsABoolean = config.modules.illegalitemsA.enabled;
    }

    try {
        // Loop until player is detected in the world
        await player.runCommandAsync(`testfor @s`);

        // Lock down the server if enabled
        if (lockdownBoolean) {
            let reason = "Under Maintenance! Sorry for the inconvenience.";
            try {
                // Kick players from server
                await player.runCommandAsync(`kick ${JSON.stringify(player.name)} ${reason}`);
            } catch (error) {
                // Despawn players from server
                kickablePlayers.add(player);
                player.triggerEvent("paradox:kick");
            }
            return system.clearRunSchedule(id);
        }

        // We execute each command in the list
        for (let i = 0; i < onJoinData.length; i++) {
            try {
                await player.runCommandAsync(`${onJoinData[i]}`);
            } catch (error) {}
        }

        // Unsubscribe if disabled in-game
        if (illegalItemsABoolean === false) {
            let allPlayers = [...World.getPlayers()];
            for (let player of allPlayers) {
                if (player.hasTag("illegalitemsA")) {
                    player.removeTag("illegalitemsA");
                }
            }
        }

        // Set up custom tag
        // tagRank(player);
        // Set up custom prefix
        getPrefix(player);
        check = true;
    } catch (error) {}
    if (check) {
        check = false;
        return system.clearRunSchedule(id);
    }
}

const onJoin = () => {
    World.events.playerSpawn.subscribe((loaded) => {
        // Get the name of the player who is joining
        let player = loaded.player;
        /**
         * We store the identifier in a variable
         * to cancel the execution of this scheduled run
         * if needed to do so.
         */
        const onJoinTimeId = system.runSchedule(() => {
            onJoinTime(player, onJoinTimeId);
        });
    });
};

export { onJoin };

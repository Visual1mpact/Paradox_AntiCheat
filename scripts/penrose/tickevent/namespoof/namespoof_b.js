import { EntityQueryOptions, world } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function namespoofb() {
    // Unsubscribe if disabled in-game
    if (config.modules.namespoofB.enabled === false) {
        World.events.tick.unsubscribe(namespoofb);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['Hash:' + crypto];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        // Namespoof/B = regex check
        try {
            if (config.modules.namespoofB.banregex.test(player.name)) {
                try {
                    if(!player.hasTag('isBanned')) {
                        player.addTag(`isBanned`);
                        player.addTag(`By:Paradox`);
                        player.addTag(`Reason:Namespoof`);
                    }
                } catch(e) {} //Add ban tags cause when namespoofing it doesnt add them correctly
                flag(player, "Namespoof", "B", "Exploit", false, false, false, false, false, false);
            }
            else if (config.modules.namespoofB.kickregex.test(player.name))
                player.runCommand(`kick "${player.nametag}" Plaese use your real xbl name!`); //Might want to change it to a flag 
        } catch(error) {
            //if someohow the nametag is modified before the tick event(joinevent) it will disconnect the player by the event
            player.triggerEvent("paradox:kick");
        }
    }
    return;
}

const NamespoofB = () => {
    // Executes every 2 seconds
    setTickInterval(() => namespoofb(), 40);
};

export { NamespoofB };
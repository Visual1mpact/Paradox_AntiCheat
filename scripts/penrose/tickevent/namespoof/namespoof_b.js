import { EntityQueryOptions, world } from "mojang-minecraft";
import { crypto, disabler, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function rip(player) {
    // Get all tags
    let tags = player.getTags();

    // This removes old ban tags
    tags.forEach(t => {
        if(t.startsWith("Reason:")) {
            player.removeTag(t);
        }
        if(t.startsWith("By:")) {
            player.removeTag(t);
        }
    });
    // Tag with reason and by who
    try {
        player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Namespoof B (Disabler)"`);
        player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
        player.addTag('isBanned');
    // Despawn if we cannot kick the player
    } catch (error) {
        player.triggerEvent('paradox:kick');
    }
}

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
        if (config.modules.namespoofB.banregex.test(player.name)) {
            rip(player);
        } else if (config.modules.namespoofB.kickregex.test(player.name)) {
            flag(player, "Namespoof", "B", "Exploit", false, false, false, false, false, false);
        }
    }
    return;
}

const NamespoofB = () => {
    // Executes every 2 seconds
    setTickInterval(() => namespoofb(), 40);
};

export { NamespoofB };
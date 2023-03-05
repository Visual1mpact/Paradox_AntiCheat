import { Player, PlayerSpawnEvent, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { getPrefix } from "../../../util.js";
import { MessageFormData } from "@minecraft/server-ui";

async function onJoinRules(object: PlayerSpawnEvent) {
    let player: Player;
    //if (object.initialSpawn == true) {
    player = object.player;
    //} else {
    //  return;
    // }
    let cfgrules: string;
    cfgrules = "These are my server rules!";
    let form = new MessageFormData();
    form.title("Server Rules");
    form.body(cfgrules);
    form.button1("I Agree.");
    let inum = 0;

    world.say(`${player.typeId}`);

    form.show(object.player);
}
const onJoinrules = () => {
    world.events.playerSpawn.subscribe(onJoinRules);
};

export { onJoinrules };

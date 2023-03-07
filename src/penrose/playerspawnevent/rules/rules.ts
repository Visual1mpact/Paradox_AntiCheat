import { Player, PlayerSpawnEvent, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { getPrefix } from "../../../util.js";
import { MessageFormData } from "@minecraft/server-ui";

async function onJoinRules(object: PlayerSpawnEvent) {
    let player: Player;
    if (object.initialSpawn == true) {
        player = object.player;
        //player.addTag("ShowRulesOnJoin");
        await player.runCommandAsync(`tag @s add ShowRulesOnJoin`);
    } else {
        return;
    }

    /*let cfgrules: string;
    cfgrules = config.modules.showrules.rules;
    let form = new MessageFormData();
    form.title("Server Rules");
    form.body(cfgrules);
    form.button1("I Agree.");
    await form
        .show(player)
        .then((r) => {
            // The code when the player responds to/closes the form
            player.removeTag("ShowRulesOnJoin");
        })
        .catch((e) => {
            console.error(e, e.stack);
        });
        */
}
const onJoinrules = () => {
    world.events.playerSpawn.subscribe(onJoinRules);
};

export { onJoinrules };

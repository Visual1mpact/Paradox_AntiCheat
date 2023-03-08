import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { getPrefix } from "../../../util.js";
import { MessageFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

function showrules(id: number) {
    //Get Dynamic Property
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");

    // Unsubscribe if disabled in-game
    if (showrulesBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }

    let filter = new Object() as EntityQueryOptions;
    filter.tags = ["ShowRulesOnJoin"];
    // run as each player
    for (let player of world.getPlayers(filter)) {
        let cfgrules: string;
        // pull the rules from the config file.
        cfgrules = config.modules.showrules.rules;
        let form = new MessageFormData();
        form.title("Server Rules");
        form.body(cfgrules);
        form.button1("I Agree");
        form.button2("Decline");
        form.show(player)
            .then((r) => {
                // This will stop the code when the player closes the form
                if (r.canceled) return;

                // The code when the player responds to the form
                player.removeTag("ShowRulesOnJoin");
            })
            .catch((e) => {
                console.error(e, e.stack);
            });
    }
}

export function ShowRules() {
    const showrulesId = system.runSchedule(() => {
        showrules(showrulesId);
    }, 40);
}

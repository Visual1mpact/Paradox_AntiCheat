import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../data/config.js";
import { sendMsgToPlayer } from "../../util.js";
import { MessageFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

async function showrules(id: number) {
    //Get Dynamic Property
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");

    // Unsubscribe if disabled in-game
    if (showrulesBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }

    const filter = new Object() as EntityQueryOptions;
    filter.tags = ["ShowRulesOnJoin"];
    // run as each player
    for (const player of world.getPlayers(filter)) {
        // pull the rules from the config file.
        const cfgrules = config.modules.showrules.rules;
        const form = new MessageFormData();
        form.title("Server Rules");
        form.body(cfgrules);
        form.button1("I Agree");
        form.button2("Decline");
        form.show(player)
            .then((r) => {
                // Button 1 (Agreement)
                if (r.selection === 1) {
                    // The code when the player responds to the form
                    player.removeTag("ShowRulesOnJoin");
                    // We appreciate you for agreeing to the rules
                    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Thank you for accepting the rules ${player.name}.`);
                }

                // Button 2 (Declined)
                if (r.selection === 0) {
                    const reason = "You must agree to the rules to join.";
                    // Goodbye lol
                    try {
                        player.runCommandAsync(`kick ${JSON.stringify(player.name)} ${reason}`);
                    } catch (error) {
                        player.triggerEvent("paradox:kick");
                    }
                }

                if (r.canceled) {
                    // This needs to be monitored with multiplayer
                    // It may cause disruptions with other players who get this form?
                    return system.clearRunSchedule(id);
                }
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

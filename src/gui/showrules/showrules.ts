import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../data/config.js";
import { sendMsgToPlayer } from "../../util.js";
import { MessageFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

async function showrules(id: number) {
    //Get Dynamic Property
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");
    const KickOnDeclineBoolean = dynamicPropertyRegistry.get("kickondecline_b");

    // Unsubscribe if disabled in-game
    if (showrulesBoolean === false && config.ParadoxUIBeta === false) {
        system.clearRun(id);
        return;
    }

    const filter = new Object() as EntityQueryOptions;
    filter.tags = ["ShowRulesOnJoin"];
    // run as each player
    for (const player of world.getPlayers(filter)) {
        // pull the rules from the config file.
        const cfgrule1 = config.modules.showrules.rule1;
        const cfgrule2 = config.modules.showrules.rule2;
        const cfgrule3 = config.modules.showrules.rule3;
        const cfgrule4 = config.modules.showrules.rule4;
        const cfgrule5 = config.modules.showrules.rule5;
        //Join the strings to make a single string and add the newlines
        const CompleteRules = cfgrule1 + "\n" + cfgrule2 + "\n" + cfgrule3 + "\n" + cfgrule4 + "\n" + cfgrule5;
        const form = new MessageFormData();
        form.title("Server Rules");
        form.body(CompleteRules);
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
                    // This needs to be monitored with multiplayer
                    // It may cause disruptions with other players who get this form?
                    return system.clearRun(id);
                }

                // Button 2 (Declined)
                if (r.selection === 0) {
                    const reason = "You must agree to the rules to join.";
                    if (KickOnDeclineBoolean === true) {
                        // Goodbye lol
                        try {
                            player.runCommandAsync(`kick ${JSON.stringify(player.name)} ${reason}`);
                        } catch (error) {
                            player.triggerEvent("paradox:kick");
                        }
                    }
                    //if kick is not enabled then dont kick

                    // This needs to be monitored with multiplayer
                    // It may cause disruptions with other players who get this form?
                    return system.clearRun(id);
                }

                if (r.canceled) {
                    // This needs to be monitored with multiplayer
                    // It may cause disruptions with other players who get this form?
                    return system.clearRun(id);
                }
            })
            .catch((e) => {
                console.error(e, e.stack);
            });
    }
}

export function ShowRules() {
    if (config.ParadoxUIBeta === true) {
        const showrulesId = system.runInterval(() => {
            showrules(showrulesId);
        }, 200);
    }
}

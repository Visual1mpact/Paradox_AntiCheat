import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../data/config.js";
import { sendMsgToPlayer } from "../../util.js";
import { MessageFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";

function waitForTwentySeconds(): Promise<void> {
    return new Promise((resolve) => {
        system.runTimeout(() => {
            resolve();
        }, 20 * 20); // 20 ticks per second, so 20 * 20 ticks = 20 seconds
    });
}

async function showrules(id: number) {
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");
    const KickOnDeclineBoolean = dynamicPropertyRegistry.get("kickondecline_b");

    if (showrulesBoolean === false) {
        system.clearRun(id);
        return;
    }

    const filter = new Object() as EntityQueryOptions;
    filter.tags = ["ShowRulesOnJoin"];

    const [cfgrule1, cfgrule2, cfgrule3, cfgrule4, cfgrule5] = [config.modules.showrules.rule1, config.modules.showrules.rule2, config.modules.showrules.rule3, config.modules.showrules.rule4, config.modules.showrules.rule5];

    const CompleteRules = `${cfgrule1}\n${cfgrule2}\n${cfgrule3}\n${cfgrule4}\n${cfgrule5}`;

    const players = world.getPlayers(filter);
    const promises = players.map(async (player) => {
        const form = new MessageFormData();
        form.title("Server Rules");
        form.body(CompleteRules);
        form.button1("I Agree");
        form.button2("Decline");
        const r = await form.show(player);
        if (r.selection === 1) {
            player.removeTag("ShowRulesOnJoin");
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Thank you for accepting the rules ${player.name}.`);
            return;
        }
        if (r.selection === 0) {
            if (KickOnDeclineBoolean === true) {
                const reason = "You must agree to the rules to join.";
                try {
                    player.runCommandAsync(`kick ${JSON.stringify(player.name)} ${reason}`);
                } catch (error) {
                    player.triggerEvent("paradox:kick");
                }
            }
            return;
        }
    });

    const allPromises = Promise.all(promises);
    const twentySecondsPromise = waitForTwentySeconds();
    await Promise.race([allPromises, twentySecondsPromise]);
}

export function ShowRules() {
    const showrulesId = system.runInterval(() => {
        showrules(showrulesId);
    }, 230);
}

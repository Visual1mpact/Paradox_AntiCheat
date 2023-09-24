import { world, EntityQueryOptions, system, PlayerLeaveAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { sendMsgToPlayer } from "../../util.js";
import { MessageFormData } from "@minecraft/server-ui";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { kickablePlayers } from "../../kickcheck.js";

const playersAwaitingResponse: Set<string> = new Set();

/**
 * Event handler for player login
 */
function onPlayerLeave(event: PlayerLeaveAfterEvent) {
    playersAwaitingResponse.delete(event.playerId);
}

async function showrules(id: number) {
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");
    const KickOnDeclineBoolean = dynamicPropertyRegistry.get("kickondecline_b");

    if (showrulesBoolean === false) {
        playersAwaitingResponse.clear();
        world.afterEvents.playerLeave.unsubscribe(onPlayerLeave);
        system.clearRun(id);
        return;
    }

    const filter = new Object() as EntityQueryOptions;
    filter.tags = ["ShowRulesOnJoin"];

    const [cfgrule1, cfgrule2, cfgrule3, cfgrule4, cfgrule5] = [config.modules.showrules.rule1, config.modules.showrules.rule2, config.modules.showrules.rule3, config.modules.showrules.rule4, config.modules.showrules.rule5];

    const CompleteRules = `${cfgrule1}\n${cfgrule2}\n${cfgrule3}\n${cfgrule4}\n${cfgrule5}`;

    const players = world.getPlayers(filter);
    const promises = players.map(async (player) => {
        if (!playersAwaitingResponse.has(player.id)) {
            playersAwaitingResponse.add(player.id);
        } else {
            // Player is already being shown the rules, skip this player.
            return;
        }

        const form = new MessageFormData();
        form.title("Server Rules");
        form.body(CompleteRules);
        form.button1("I Agree");
        form.button2("Decline");
        const r = await form.show(player);

        if (r.selection === 0) {
            playersAwaitingResponse.delete(player.id); // Player has responded, remove from set.
            player.removeTag("ShowRulesOnJoin");
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Thank you for accepting the rules §7${player.name}§f.`);
            return;
        }
        if (r.selection === 1) {
            playersAwaitingResponse.delete(player.id); // Player has responded, remove from set.
            if (KickOnDeclineBoolean === true) {
                const reason = "You must agree to the rules to join.";
                player.runCommandAsync(`kick "${player.name}" §f\n\n${reason}`).catch(() => {
                    kickablePlayers.add(player);
                    player.triggerEvent("paradox:kick");
                });
            }
            return;
        }
        if (r.canceled) {
            playersAwaitingResponse.delete(player.id); // Player has responded, remove from set.
        }
    });

    await Promise.all(promises);
}

export function ShowRules() {
    // Subscribe to the player leave event
    world.afterEvents.playerLeave.subscribe(onPlayerLeave);

    const showrulesId = system.runInterval(() => {
        showrules(showrulesId).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    }, 230);
}

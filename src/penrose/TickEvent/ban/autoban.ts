import { Player, system, world } from "@minecraft/server";
import { kickablePlayers } from "../../../kickcheck";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry";
import config from "../../../data/config";
import { ScoreManager } from "../../../classes/ScoreManager";

const configTicks: number = config.modules.autoBan.banHammerInterval;
function rip(player: Player, reason: string) {
    // Tag with reason and by who
    try {
        player.addTag(`Reason:${reason}`);
        player.addTag("By:Paradox");
        player.addTag("isBanned");
        // Despawn if we cannot kick the player
    } catch (error) {
        kickablePlayers.add(player);
        player.triggerEvent("paradox:kick");
    }
}

function autoban(id: number) {
    const autoBanBoolean = dynamicPropertyRegistry.get("autoban_b");

    // Unsubscribe if disabled in-game
    if (autoBanBoolean === false) {
        system.clearRun(id);
        return;
    }
    const scores = ScoreManager.allscores;

    const players = world.getPlayers();
    players.forEach((player) => {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);
        // Skip if they have permission
        if (uniqueId === player.name) {
            return;
        }
        scores.forEach((score) => {
            const playerScore = ScoreManager.getScore(score, player);
            if (playerScore > 50) {
                const reReason = score.replace("vl", "").toUpperCase() + " Violations: " + playerScore;
                return rip(player, reReason);
            }
        });
    });
}

export function AutoBan() {
    const autoBanId = system.runInterval(() => {
        autoban(autoBanId);
        //set ticks to 6000 for 5 minutes.
    }, configTicks);
}

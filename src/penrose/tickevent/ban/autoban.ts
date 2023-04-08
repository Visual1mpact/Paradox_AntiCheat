import { Player, system, world } from "@minecraft/server";
import { kickablePlayers } from "../../../kickcheck";
import { getScore } from "../../../util";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry";

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
    const scores = [
        "autoclickervl",
        "badpacketsvl",
        "killauravl",
        "flyvl",
        "illegalitemsvl",
        "interactusevl",
        "cbevl",
        "gamemodevl",
        "autototemvl",
        "spammervl",
        "namespoofvl",
        "noslowvl",
        "crashervl",
        "reachvl",
        "invmovevl",
        "invalidsprintvl",
        "armorvl",
        "antikbvl",
    ];

    for (const player of world.getPlayers()) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            return;
        }

        scores.forEach((score) => {
            const playerScore = getScore(score, player);
            if (playerScore > 50) {
                let reReason = score.replace("vl", "").toUpperCase() + " Violations: " + playerScore;
                return rip(player, reReason);
            }
        });
    }
}

export function AutoBan() {
    const autoBanId = system.runInterval(() => {
        autoban(autoBanId);
        //set ticks to 6000 for 5 minutes.
    }, 20);
}

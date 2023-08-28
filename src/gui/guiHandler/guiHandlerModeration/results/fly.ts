import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiFLY } from "../../../moderation/uiFly";

export function flyHandler(player: Player) {
    const flyui = new ModalFormData();
    flyui.title("§4Paradox - Grant A Player Fly Abilities§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    flyui.dropdown(`\n§fSelect a player to allow the ability to fly:§f\n\nPlayer's Online\n`, onlineList);
    flyui
        .show(player)
        .then((flyResult) => {
            uiFLY(flyResult, onlineList, player);
        })
        .catch((error) => {
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
}

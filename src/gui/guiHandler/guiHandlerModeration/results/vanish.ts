import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiVANISH } from "../../../moderation/uiVanish";

export function vanishHandler(player: Player) {
    const vanishui = new ModalFormData();
    vanishui.title("§4Paradox - Vanish From The Server§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    vanishui.dropdown(`\n§fSelect a player to vanish:§f\n\nPlayer's Online\n`, onlineList);
    vanishui
        .show(player)
        .then((vanishResult) => {
            uiVANISH(vanishResult, onlineList, player);
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

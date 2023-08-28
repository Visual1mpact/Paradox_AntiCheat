import { Player, world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import config from "../../../data/config";
import { uiOP } from "../../moderation/uiOp";

export function opHandler(player: Player, uniqueId: string, salt: string, hash: string) {
    // New window for op
    let opgui: ModalFormData | ActionFormData;
    let onlineList: string[] = [];
    if (uniqueId === player.name) {
        opgui = new ModalFormData();
        opgui.title("§4OP§4");

        onlineList = Array.from(world.getPlayers(), (player) => player.name);
        opgui.dropdown(`\n§fSelect a player to give access to Paradox:§f\n\nPlayer's Online\n`, onlineList);
    } else if (!config.encryption.password) {
        opgui = new ActionFormData();
        opgui.title("§4OP§4");

        opgui.button("Grant OP Access", "textures/ui/op");
    } else if (config.encryption.password) {
        opgui = new ModalFormData();
        opgui.title("§4OP§4");

        opgui.textField("Enter Password:", "");
    }
    opgui
        .show(player)
        .then((opResult) => {
            uiOP(opResult, salt, hash, player, onlineList);
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

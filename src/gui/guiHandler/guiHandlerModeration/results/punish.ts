import { Player, world } from "@minecraft/server";
import { MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { uiPUNISH } from "../../../moderation/uiPunish";
import { paradoxui } from "../../../paradoxui";

export function punishHandler(player: Player) {
    //Punish UI im going to use two forms one as a yes/no message so i can advise what this will do.
    const punishprewarnui = new MessageFormData();
    punishprewarnui.title("§4Paradox - Punish§4");
    punishprewarnui.body("This will allow you to wipe a player's Ender chest as well as their inventory.");
    punishprewarnui.button1("Continue");
    punishprewarnui.button2("Back");
    punishprewarnui
        .show(player)
        .then((prewarnResult) => {
            if (prewarnResult.selection === 0) {
                //show the Punish UI
                const punishui = new ModalFormData();
                let onlineList: string[] = [];
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                punishui.title("§4Paradox - Punish§4");
                punishui.dropdown(`\n§fSelect a player to wipe:§f\n\nPlayer's Online\n`, onlineList);
                punishui
                    .show(player)
                    .then((punishResult) => {
                        uiPUNISH(punishResult, onlineList, player);
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
            } else if (prewarnResult.selection === 1 || prewarnResult.canceled) {
                paradoxui(player);
            }
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

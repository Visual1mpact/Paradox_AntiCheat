import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { notifyHandler } from "./results/notify";
import { chatRanksHandler } from "./results/chatranks";
import { muteHandler } from "./results/mute";
import { unmuteHandler } from "./results/unmute";
import { clearChatHandler } from "./results/clearchat";

export function chatui(player: Player) {
    //show chat ui
    const chatui = new ActionFormData();
    chatui.title("§4Paradox - Configure Chat§4");
    chatui.body("§eSettings related to chat.§e");
    chatui.button("Notify", "textures/ui/chat_send");
    chatui.button("Ranks", "textures/ui/saleribbon");
    chatui.button("Mute", "textures/ui/mute_on");
    chatui.button("Unmute", "textures/ui/mute_off");
    chatui.button("Clear Chat", "textures/ui/cancel");
    chatui
        .show(player)
        .then((chatResult) => {
            // Use a switch statement to handle different selections
            switch (chatResult.selection) {
                case 0:
                    notifyHandler(player);
                    break;
                case 1:
                    chatRanksHandler(player);
                    break;
                case 2:
                    muteHandler(player);
                    break;
                case 3:
                    unmuteHandler(player);
                    break;
                case 4:
                    clearChatHandler(player);
                    break;
                default:
                    break;
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

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiChatChannelCreate } from "./uiChatChannels";
export function chatChannelsCreateMenuUI(player: Player) {
    const menu = new ModalFormData();
    menu.title("§4Paradox - Chat Channels Create§4");
    menu.textField("Channel Name: ", "Test");
    menu.textField("Password:", "Password123");
    menu.show(player)
        .then((chatChannelsCreateResult) => {
            uiChatChannelCreate(chatChannelsCreateResult, player);
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

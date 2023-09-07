import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getPlayerChannel } from "../../../util";
import { uiChatChannelDelete } from "./uiChatChannels";

export function ChatChannelsDeleteMenuUI(player: Player) {
    const menu = new ActionFormData();
    menu.title("§4Paradox - Delete Current Channel§4");
    const currentChatChannel = getPlayerChannel(player.id);
    menu.body(`§fYour current chat channel is §6${currentChatChannel}§f, using the button bellow you can delete this channel if it is password protected you will need to provide the password.`);
    menu.button("Delete Channel");
    menu.button("Back");
    menu.show(player)
        .then((chatChannelsDeleteResult) => {
            uiChatChannelDelete(chatChannelsDeleteResult, player, currentChatChannel);
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

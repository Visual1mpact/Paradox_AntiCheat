import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { chatChannelsCreateMenuUI } from "../../playerui/chatChannels/uiChatChannelsCreateMenu";
import { ChatChannelsJoinMenuUI } from "../../playerui/chatChannels/uiChatChannelsJoinMenu";
import { ChatChannelsInviteMenuUI } from "../../playerui/chatChannels/uiChatChannelsInviteMenu";
import { chatChannelsLeaveMenuUI } from "../../playerui/chatChannels/uiChatChannelsLeaveMenu";
import { ChatChannelsDeleteMenuUI } from "../../playerui/chatChannels/uiChatChannelsDeleteMenu";
export function chatChannelMainMenu(player: Player) {
    const menu = new ActionFormData();
    menu.title("§4Paradox - Chat Channels Menu§4");
    menu.button("Create A Channel");
    menu.button("Join A Channel");
    menu.button("Invite A Player");
    menu.button("Leave A Channel");
    menu.button("Delete A Channel");
    menu.show(player)
        .then((chatChannelsMenuUIResult) => {
            switch (chatChannelsMenuUIResult.selection) {
                case 0:
                    chatChannelsCreateMenuUI(player);
                    break;
                case 1:
                    ChatChannelsJoinMenuUI(player);
                    break;
                case 2:
                    ChatChannelsInviteMenuUI(player);
                    break;
                case 3:
                    chatChannelsLeaveMenuUI(player);
                    break;
                case 4:
                    ChatChannelsDeleteMenuUI(player);
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

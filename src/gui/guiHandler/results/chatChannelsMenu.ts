import { Player } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { chatChannelsCreateMenuUI } from "../../playerui/chatChannels/uiChatChannelsCreateMenu";
import { ChatChannelsJoinMenuUI } from "../../playerui/chatChannels/uiChatChannelsJoinMenu";
import { ChatChannelsInviteMenuUI } from "../../playerui/chatChannels/uiChatChannelsInviteMenu";
export function chatChannelMainMenu(player: Player) {
    const menu = new ActionFormData();
    menu.title("§4Paradox - Chat Channels Menu§4");
    menu.button("Create A Channel");
    menu.button("Join A Channel");
    menu.button("Invite A Player");
    menu.button("Leave A Channel");
    menu.button("Delete A Channel");
    menu.show(player).then((chatChannelsMenuUIResult) => {
        switch (chatChannelsMenuUIResult.selection) {
            case 0:
                chatChannelsCreateMenuUI(player);
                break;
            case 1:
                ChatChannelsJoinMenuUI(player);
                break;
            case 2:
                ChatChannelsInviteMenuUI(player);
            default:
                break;
        }
    });
}

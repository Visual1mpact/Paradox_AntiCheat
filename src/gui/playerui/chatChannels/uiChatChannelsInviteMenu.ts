import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { listChatChannels } from "../../../util";
import { uiChatChannelInvite } from "./uiChatChannels";

export function ChatChannelsInviteMenuUI(player: Player) {
    const menu = new ModalFormData();
    menu.title("§4Paradox - Invite A Player§4");
    const channelsList = listChatChannels();
    //Get the current channels
    const channelDropdownData = channelsList.map((channel) => ({
        text: `${channel.channelName}, §fPassword: ${channel.hasPassword === "Yes" ? "§aYes" : "§cNo"}`,
        value: channel.channelName,
    }));
    if (channelDropdownData.length === 0) {
        channelDropdownData.push({ text: "§6There are no existing channels", value: "" });
    }
    //Get the current players online
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    menu.dropdown(`\n§fSelect a player to invite:§f\n\nPlayer's Online\n`, onlineList);
    menu.dropdown(`\n§fSelect a channel:\n\n`, channelDropdownData);
    //menu.textField("Channel Password: ", "");
    menu.show(player)
        .then((chatChannelsInviteResult) => {
            uiChatChannelInvite(chatChannelsInviteResult, player, channelDropdownData, onlineList);
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

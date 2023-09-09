import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiChatChannelJoin } from "./uiChatChannels";
import { ChatChannelManager } from "../../../classes/ChatChannelManager";

export function ChatChannelsJoinMenuUI(player: Player) {
    const menu = new ModalFormData();
    menu.title("§4Paradox - Join A Channel§4");
    const channelsList = ChatChannelManager.listChatChannels();
    const channelDropdownData = channelsList.map((channel) => ({
        text: `${channel.channelName}, §fPassword: ${channel.hasPassword === true ? "§aYes" : "§cNo"}`,
        value: channel.channelName,
    }));
    if (channelDropdownData.length === 0) {
        channelDropdownData.push({ text: "§6There are no existing channels", value: "" });
    }
    menu.dropdown(`\n§fSelect a channel:\n\n`, channelDropdownData);
    menu.textField("Channel Password: ", "");
    menu.show(player)
        .then((chatChannelsJoinResult) => {
            uiChatChannelJoin(chatChannelsJoinResult, player, channelDropdownData);
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

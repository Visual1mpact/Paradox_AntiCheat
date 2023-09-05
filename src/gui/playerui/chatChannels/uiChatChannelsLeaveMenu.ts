import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { listChatChannels } from "../../../util";
import { uiChatChannelLeave } from "./uiChatChannels";
export function chatChannelsLeaveMenuUI(player: Player) {
    const menu = new ModalFormData();
    const channelsList = listChatChannels();
    const channelDropdownData = channelsList.map((channel) => ({
        text: `${channel.channelName}, §fPassword: ${channel.hasPassword === "Yes" ? "§aYes" : "§cNo"}`,
        value: channel.channelName,
    }));
    if (channelDropdownData.length === 0) {
        channelDropdownData.push({ text: "§6There are no existing channels", value: "" });
    }
    menu.title("§4Paradox - Chat Channels Leave§4");
    menu.dropdown(`\n§fSelect a channel:\n\n`, channelDropdownData);
    menu.show(player)
        .then((chatChannelsLeaveResult) => {
            uiChatChannelLeave(chatChannelsLeaveResult, player, channelDropdownData);
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

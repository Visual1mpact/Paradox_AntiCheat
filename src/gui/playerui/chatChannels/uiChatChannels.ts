import { Player } from "@minecraft/server";
import { MessageFormData, ModalFormResponse } from "@minecraft/server-ui";
import { createChatChannel, getPlayerChannel } from "../../../util";

export function uiChatChannelCreate(ChatChannelCreateUIResult: ModalFormResponse, player: Player) {
    handleUIChatChannelCreate(ChatChannelCreateUIResult, player).catch((error) => {
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

    async function handleUIChatChannelCreate(ChatChannelCreateUIResult: ModalFormResponse, player: Player) {
        const [txtChannelName, txtChannelPassword] = ChatChannelCreateUIResult.formValues;
        const existingChannelName = getPlayerChannel(player.id);

        if (existingChannelName) {
            const msgUI = new MessageFormData();
            msgUI.title("§4Create Channel Error§4");
            msgUI.body("§f You are already in a chat channel §6(${existingChannelName}). §fLeave the current channel before creating a new one.");
            msgUI.button1("OK");
            msgUI.show(player);
        } else {
            const channelName = txtChannelName;
            const password = txtChannelPassword; // Optional password argument

            const createResult = createChatChannel(channelName.toString(), password.toString(), player.id);
            const msgUI = new MessageFormData();
            msgUI.title("§4Chat Channel Created§4");
            msgUI.body(`§f§4[§6Paradox§4]§f Chat channel '${channelName}' ${createResult ? "§2created." : "§6already exists."}`);
            msgUI.button1("OK");
        }
    }
}

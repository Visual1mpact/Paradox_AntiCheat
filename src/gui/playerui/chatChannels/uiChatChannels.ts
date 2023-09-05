import { Player, world } from "@minecraft/server";
import { MessageFormData, ModalFormResponse } from "@minecraft/server-ui";
import { chatChannels, createChatChannel, deleteChatChannel, getPlayerById, getPlayerByName, getPlayerChannel, handOverChannelOwnership, inviteToChatChannel, playerChannelMap, sendMsgToPlayer, switchChatChannel } from "../../../util";

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
            msgUI.body(`§f You are already in a chat channel §6(${existingChannelName}). §fLeave the current channel before creating a new one.`);
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
export function uiChatChannelJoin(ChatChannelJoinUIResult: ModalFormResponse, player: Player, channelDropdownData: { text: string; value: string }[]) {
    handleUIChatChannelJoin(ChatChannelJoinUIResult, player, channelDropdownData).catch((error) => {
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

    async function handleUIChatChannelJoin(ChatChannelJoinUIResult: ModalFormResponse, player: Player, channelDropdownData: { text: string; value: string }[]) {
        const [ddChannelName, txtChannelPassword] = ChatChannelJoinUIResult.formValues;
        const existingChannelName = getPlayerChannel(player.id);

        if (existingChannelName) {
            const msgUI = new MessageFormData();
            msgUI.title("§4Join Channel Error§4");
            msgUI.body("§f You are already in a chat channel §6(${existingChannelName}). §fLeave the current channel before creating a new one.");
            msgUI.button1("OK");
            msgUI.show(player);
        } else {
            const selectedNumber = ddChannelName; //Presented as a Number not the dropdown value the player sees
            let selectedChannelName = ""; //This will be used to store the extracted data.

            for (const item of channelDropdownData) {
                if (parseInt(item.value) === selectedNumber) {
                    const commaIndex = item.text.indexOf(","); // We need the channel name before the comma
                    if (commaIndex !== -1) {
                        selectedChannelName = item.text.substring(0, commaIndex).trim();
                    } else {
                        selectedChannelName = item.text.trim(); // if no comma is found trim the entire text.
                    }
                    break;
                }
            }
            //Join code extracted from visuals chat commands. I have added a uiMessage to store any errors or if the player is added to the channel.
            const passwordToJoin = txtChannelPassword.toString(); // Optional password argument
            const newChannel = switchChatChannel(player.id, selectedChannelName, passwordToJoin);
            let uiMessage = "";
            if (newChannel === "wrong_password") {
                uiMessage = `§6 Wrong password for chat channel §f'${selectedChannelName}'.`;
            } else if (newChannel === "already_in_channel") {
                uiMessage = `§6 You are already in a chat channel. Please leave your current channel first.`;
            } else if (newChannel !== false) {
                const joinedPlayer = getPlayerById(player.id);
                const joinedPlayerName = joinedPlayer ? joinedPlayer.name : "Unknown Player";

                const joinMessage = `§f§4[§6Paradox§4]§f §6${joinedPlayerName}§f joined the chat channel.`;
                const channel = chatChannels[selectedChannelName];
                uiMessage = `§f You have been added to §2${selectedChannelName}.`;

                channel.members.forEach((memberId) => {
                    const member = getPlayerById(memberId);
                    if (member && member !== joinedPlayer) {
                        sendMsgToPlayer(member, joinMessage);
                    }
                });
            } else {
                uiMessage = `§6Unable to join chat channel §r${selectedChannelName}, please try again.`;
            }

            const msgUI = new MessageFormData();
            msgUI.title("§4Chat Channel Created§4");
            msgUI.body(uiMessage);
            msgUI.button1("OK");
            msgUI.show(player);
        }
    }
}
export function uiChatChannelInvite(ChatChannelJoinUIResult: ModalFormResponse, player: Player, channelDropdownData: { text: string; value: string }[], onlineList: string[]) {
    handleUIChatChannelInvite(ChatChannelJoinUIResult, player, channelDropdownData, onlineList).catch((error) => {
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

    async function handleUIChatChannelInvite(ChatChannelInviteUIResult: ModalFormResponse, player: Player, channelDropdownData: { text: string; value: string }[], onlineList: string[]) {
        const [ddChannelName, ddMember] = ChatChannelInviteUIResult.formValues;
        // const existingChannelName = getPlayerChannel(player.id);
        let uiMessage = "";
        const selectedNumber = ddChannelName; //Presented as a Number not the dropdown value the player sees
        let selectedChannelName = ""; //This will be used to store the extracted data.
        for (const item of channelDropdownData) {
            if (parseInt(item.value) === selectedNumber) {
                const commaIndex = item.text.indexOf(","); // We need the channel name before the comma
                if (commaIndex !== -1) {
                    selectedChannelName = item.text.substring(0, commaIndex).trim();
                } else {
                    selectedChannelName = item.text.trim(); // if no comma is found trim the entire text.
                }
                break;
            }
        }
        let member: Player = undefined;
        const players = world.getPlayers();
        for (const pl of players) {
            if (pl.name.toLowerCase().includes(onlineList[ddMember as number].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
                break;
            }
        }
        //Invite code from visuals command chat channels
        const channelNameToInvite = selectedChannelName;
        const playerToInvite = member.name;
        if (!playerToInvite) {
            uiMessage = `§6 Something went wrong did you select a player to invite, please try again.`;
        }
        const joinedPlayer = getPlayerByName(playerToInvite);
        if (playerToInvite) {
            const inviteResult = inviteToChatChannel(playerToInvite, channelNameToInvite);
            if (inviteResult) {
                uiMessage = `§fInvited ${playerToInvite} to join chat channel '${channelNameToInvite}'.`;
                const joinedPlayerName = joinedPlayer ? joinedPlayer.name : "Unknown Player";

                const joinMessage = `§f§4[§6Paradox§4]§f §6${joinedPlayerName}§f joined the chat channel.`;
                const channel = chatChannels[channelNameToInvite];

                channel.members.forEach((memberId) => {
                    const member = getPlayerById(memberId);
                    if (member && member !== joinedPlayer) {
                        sendMsgToPlayer(member, joinMessage);
                    }
                });

                sendMsgToPlayer(joinedPlayer, `§f§4[§6Paradox§4]§f ${player.name} invited you to channel '${channelNameToInvite}'.`);
            } else {
                uiMessage = `§6f ${playerToInvite} is already in a chat channel.`;
            }
        } else {
            uiMessage = `§6Player '${playerToInvite}' not found.`;
        }
        const msgUI = new MessageFormData();
        msgUI.title("§4Chat Channel Invite§4");
        msgUI.body(uiMessage);
        msgUI.button1("OK");
        msgUI.show(player);
    }
}
export function uiChatChannelLeave(ChatChannelLeaveUIResult: ModalFormResponse, player: Player, channelDropdownData: { text: string; value: string }[]) {
    handleUIChatChannelCreate(ChatChannelLeaveUIResult, player, channelDropdownData).catch((error) => {
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

    async function handleUIChatChannelCreate(ChatChannelLeaveUIResult: ModalFormResponse, player: Player, channelDropdownData: { text: string; value: string }[]) {
        //const [ddChannelName] = ChatChannelLeaveUIResult.formValues;
        const channelNameToLeave = getPlayerChannel(player.id);

        if (!channelNameToLeave) {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are not in any chat channel.`);
            return;
        }

        const channelToLeave = chatChannels[channelNameToLeave];
        const isOwner = channelToLeave.owner === player.id;

        // Remove the player from the channel
        channelToLeave.members.delete(player.id);
        playerChannelMap[player.id] = null;

        // Inform all remaining members in the channel that the player left
        const leavingPlayer = getPlayerById(player.id);
        const leavingPlayerName = leavingPlayer ? leavingPlayer.name : "Unknown Player";
        const leaveMessage = `§f§4[§6Paradox§4]§f §6${leavingPlayerName}§f left the chat channel.`;

        channelToLeave.members.forEach((memberId) => {
            const member = getPlayerById(memberId);
            if (member) {
                sendMsgToPlayer(member, leaveMessage);
            }
        });

        if (isOwner) {
            // If the leaving player is the owner, transfer ownership to another member
            const newOwnerId = Array.from(channelToLeave.members)[0]; // Get the first member as new owner

            if (newOwnerId) {
                handOverChannelOwnership(channelNameToLeave, getPlayerById(player.id), getPlayerById(newOwnerId).name);
                const newOwnerObject = getPlayerById(newOwnerId);
                sendMsgToPlayer(newOwnerObject, `§f§4[§6Paradox§4]§f Ownership of chat channel '${channelNameToLeave}' transferred to '${newOwnerObject.name}'.`);
            } else {
                // If no other members, delete the channel
                deleteChatChannel(channelNameToLeave, channelToLeave.password);
            }
        }

        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Left the chat channel '${channelNameToLeave}'.`);
    }
}

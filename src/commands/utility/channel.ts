import { ChatSendAfterEvent, Player, PlayerLeaveAfterEvent, world } from "@minecraft/server";
import { getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatChannelManager } from "../../classes/ChatChannelManager.js";

function chatChannelHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.channel) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Chat Channel Commands§4]§f:`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel create <channelName> <password?>`,
        `§4[§6Description§4]§f: Create a new chat channel (with optional password).`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel create test`,
        `        §4- §6Create a chat channel named 'test' without a password§f`,
        `    ${prefix}channel create test password123`,
        `        §4- §6Create a chat channel named 'test' with password 'password123'§f`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel delete <channelName> <password?>`,
        `§4[§6Description§4]§f: Delete an existing chat channel (with optional password).`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel delete test`,
        `        §4- §6Delete the chat channel named 'test'§f`,
        `    ${prefix}channel delete test password123`,
        `        §4- §6Delete the chat channel named 'test' with password 'password123'§f`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel invite <channelName> <playerName>`,
        `§4[§6Description§4]§f: Invite a player to join your chat channel.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel invite test player123`,
        `        §4- §6Invite 'player123' to join the chat channel 'test'§f`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel join <channelName> <password?>`,
        `§4[§6Description§4]§f: Join a chat channel (with optional password).`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel join test`,
        `        §4- §6Join the chat channel 'test'§f`,
        `    ${prefix}channel join test password123`,
        `        §4- §6Join the chat channel 'test' with password 'password123'§f`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel handover <channelName> <playerName>`,
        `§4[§6Description§4]§f: Transfer ownership of a chat channel.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel handover test newOwner123`,
        `        §4- §6Transfer ownership of the chat channel 'test' to 'newOwner123'§f`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel members`,
        `§4[§6Description§4]§f: List all members in the same chat channel.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel members`,
        `        §4- §6List all members in the same chat channel§f`,
        ``,
        `§4[§6Command§4]§f: ${prefix}channel leave`,
        `§4[§6Description§4]§f: Leave the current chat channel.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}channel leave`,
        `        §4- §6Leave the current chat channel§f`,
    ]);
}

export function chatChannel(message: ChatSendAfterEvent, args: string[]) {
    if (!message) {
        console.warn(`${new Date()} | Error: ${message} isn't defined.`);
        return;
    }

    const player = message.sender;
    const prefix = getPrefix(player);

    const commandArgs = args;

    if (commandArgs[0] !== "members" && commandArgs[0] !== "leave" && (commandArgs[0] === "help" || commandArgs.length < 2)) {
        chatChannelHelp(player, prefix);
        return;
    }

    const subCommand = commandArgs[0]; // Extract the subcommand
    const subCommandArgs = commandArgs.slice(1); // Extract the subcommand arguments

    switch (subCommand) {
        case "members": {
            const channelNameForMembers = ChatChannelManager.getPlayerChannel(player.id);

            if (!channelNameForMembers) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are not in any chat channel.`);
                return;
            }

            const channel = ChatChannelManager.getChatChannelByName(channelNameForMembers);
            const channelMembers = channel.members;

            const memberListTitle = `§f§4[§6Paradox§4]§f Getting all Members from: §6${channelNameForMembers}§f`;
            const membersList = Array.from(channelMembers)
                .map((memberID) => {
                    const member = ChatChannelManager.getPlayerById(memberID);
                    if (member !== null) {
                        const isStatus = member.id === channel.owner ? "Owner" : "Member";
                        return ` §o§6| §4[§6${isStatus}§4] §7${member.name}§f`;
                    }
                    return "";
                })
                .filter((memberLine) => memberLine !== "")
                .join("\n");

            sendMsgToPlayer(player, [memberListTitle, membersList]);
            break;
        }

        case "create": {
            const existingChannelName = ChatChannelManager.getPlayerChannel(player.id);

            if (existingChannelName) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are already in a chat channel (§7${existingChannelName}§f). Leave the current channel before creating a new one.`);
            } else {
                const channelName = subCommandArgs[0];
                const password = subCommandArgs[1]; // Optional password argument

                const createResult = ChatChannelManager.createChatChannel(channelName, password, player.id);
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Chat channel '§7${channelName}§f' ${createResult ? "created." : "already exists."}`);
            }
            break;
        }

        case "delete": {
            const channelNameToDelete = subCommandArgs[0];
            const passwordToDelete = subCommandArgs[1]; // Optional password argument

            const deleteResult = ChatChannelManager.deleteChatChannel(channelNameToDelete, passwordToDelete);

            if (deleteResult === "wrong_password") {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Wrong password for chat channel '§7${channelNameToDelete}§f'.`);
            } else {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Chat channel '§7${channelNameToDelete}§f' ${deleteResult ? "deleted." : "not found."}`);
            }
            break;
        }

        case "invite": {
            const channelNameToInvite = subCommandArgs[0];
            const playerToInvite = subCommandArgs[1];

            if (!playerToInvite) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Usage: ${prefix}channel invite <channelName> <playerName>`);
                return;
            }

            const joinedPlayer = ChatChannelManager.getPlayerByName(playerToInvite);

            if (playerToInvite) {
                const inviteResult = ChatChannelManager.inviteToChatChannel(playerToInvite, channelNameToInvite);
                if (inviteResult) {
                    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Invited §7${playerToInvite}§f to join chat channel '§7${channelNameToInvite}§f'.`);
                    const joinedPlayerName = joinedPlayer ? joinedPlayer.name : "Unknown Player";

                    const joinMessage = `§f§4[§6Paradox§4]§f §6${joinedPlayerName}§f joined the chat channel.`;
                    const channel = ChatChannelManager.getChatChannelByName(channelNameToInvite);

                    channel.members.forEach((memberId) => {
                        const member = ChatChannelManager.getPlayerById(memberId);
                        if (member && member !== joinedPlayer) {
                            sendMsgToPlayer(member, joinMessage);
                        }
                    });

                    sendMsgToPlayer(joinedPlayer, `§f§4[§6Paradox§4]§f §7${player.name}§f invited you to channel '§7${channelNameToInvite}§f'.`);
                } else {
                    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f §7${playerToInvite}§f is already in a chat channel.`);
                }
            } else {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Player '§7${playerToInvite}§f' not found.`);
            }
            break;
        }

        case "join": {
            const channelNameToJoin = subCommandArgs[0];
            const passwordToJoin = subCommandArgs[1]; // Optional password argument

            const newChannel = ChatChannelManager.switchChatChannel(player.id, channelNameToJoin, passwordToJoin);

            if (newChannel === "wrong_password") {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Wrong password for chat channel '§7${channelNameToJoin}§f'.`);
            } else if (newChannel === "already_in_channel") {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are already in a chat channel. Please leave your current channel first.`);
            } else if (newChannel !== false) {
                const joinedPlayer = ChatChannelManager.getPlayerById(player.id);
                const joinedPlayerName = joinedPlayer ? joinedPlayer.name : "Unknown Player";

                const joinMessage = `§f§4[§6Paradox§4]§f §6${joinedPlayerName}§f joined the chat channel.`;
                const channel = ChatChannelManager.getChatChannelByName(channelNameToJoin);

                channel.members.forEach((memberId) => {
                    const member = ChatChannelManager.getPlayerById(memberId);
                    if (member && member !== joinedPlayer) {
                        sendMsgToPlayer(member, joinMessage);
                    }
                });

                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You joined chat channel '§7${channelNameToJoin}§f'.`);
            } else {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Unable to join chat channel.`);
            }
            break;
        }

        case "handover": {
            const channelNameToHandOver = subCommandArgs[0];
            const newOwnerName = subCommandArgs[1];

            const handOverResult = ChatChannelManager.handOverChannelOwnership(channelNameToHandOver, player, newOwnerName);

            if (handOverResult === "not_owner") {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are not the owner of chat channel '§7${channelNameToHandOver}§f'.`);
            } else if (handOverResult === "target_not_found") {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Player '§7${newOwnerName}§f' not found.`);
            } else if (handOverResult) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Ownership of chat channel '§7${channelNameToHandOver}§f' transferred to '§7${newOwnerName}§f'.`);
            } else {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Unable to transfer ownership of chat channel.`);
            }
            break;
        }

        case "leave": {
            const channelNameToLeave = ChatChannelManager.getPlayerChannel(player.id);

            if (!channelNameToLeave) {
                sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are not in any chat channel.`);
                return;
            }

            const channelToLeave = ChatChannelManager.getChatChannelByName(channelNameToLeave);
            const isOwner = channelToLeave.owner === player.id;

            // Remove the player from the channel
            channelToLeave.members.delete(player.id);
            ChatChannelManager.clearPlayerFromChannelMap(player.id);

            // Inform all remaining members in the channel that the player left
            const leavingPlayer = ChatChannelManager.getPlayerById(player.id);
            const leavingPlayerName = leavingPlayer ? leavingPlayer.name : "Unknown Player";
            const leaveMessage = `§f§4[§6Paradox§4]§f §6${leavingPlayerName}§f left the chat channel.`;

            channelToLeave.members.forEach((memberId) => {
                const member = ChatChannelManager.getPlayerById(memberId);
                if (member) {
                    sendMsgToPlayer(member, leaveMessage);
                }
            });

            if (isOwner) {
                // If the leaving player is the owner, transfer ownership to another member
                const newOwnerId = Array.from(channelToLeave.members)[0]; // Get the first member as new owner

                if (newOwnerId) {
                    ChatChannelManager.handOverChannelOwnership(channelNameToLeave, ChatChannelManager.getPlayerById(player.id), ChatChannelManager.getPlayerById(newOwnerId).name);
                    const newOwnerObject = ChatChannelManager.getPlayerById(newOwnerId);
                    sendMsgToPlayer(newOwnerObject, `§f§4[§6Paradox§4]§f Ownership of chat channel '§7${channelNameToLeave}§f' transferred to '§7${newOwnerObject.name}§f'.`);
                } else {
                    // If no other members, delete the channel
                    ChatChannelManager.deleteChatChannel(channelNameToLeave, channelToLeave.password);
                }
            }

            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Left the chat channel '§7${channelNameToLeave}§f'.`);
            break;
        }

        default:
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Unknown chat channel command. Use '§7${prefix}channel help§f' for command help.`);
            break;
    }
}

// Define a callback function to handle the playerLeave event
function onPlayerLeave(event: PlayerLeaveAfterEvent) {
    const playerId = event.playerId;
    const channelName = ChatChannelManager.getPlayerChannel(playerId);

    if (!channelName) {
        return; // Player wasn't in any channel
    }

    const channel = ChatChannelManager.getChatChannelByName(channelName);

    if (channel.owner === playerId) {
        // If the leaving player is the owner, transfer ownership to another member
        const newOwnerId = Array.from(channel.members).find((memberId) => memberId !== playerId);

        if (newOwnerId) {
            ChatChannelManager.handOverChannelOwnership(channelName, ChatChannelManager.getPlayerById(playerId), newOwnerId);
            const newOwnerObject = ChatChannelManager.getPlayerById(newOwnerId);
            sendMsgToPlayer(newOwnerObject, `§f§4[§6Paradox§4]§f Ownership of chat channel '§7${channelName}§f' transferred to '§7${newOwnerObject.name}§f'.`);
        } else {
            // If no other members, delete the channel
            ChatChannelManager.deleteChatChannel(channelName, channel.password);
            return;
        }
    }

    // Remove the player from the channel
    channel.members.delete(playerId);
    ChatChannelManager.clearPlayerFromChannelMap(playerId);

    // Inform all remaining members in the channel that the player left
    const leavingPlayer = ChatChannelManager.getPlayerById(playerId);
    const leavingPlayerName = leavingPlayer ? leavingPlayer.name : "Unknown Player";

    const leaveMessage = `§f§4[§6Paradox§4]§f §6${leavingPlayerName}§f left the chat channel.`;
    channel.members.forEach((memberId) => {
        const member = ChatChannelManager.getPlayerById(memberId);
        if (member) {
            sendMsgToPlayer(member, leaveMessage);
        }
    });
}

const onChannelLeave = () => {
    // Subscribe the callback function to the playerLeave event
    world.afterEvents.playerLeave.subscribe(onPlayerLeave);
};

export { onChannelLeave };

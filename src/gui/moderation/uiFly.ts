import { Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
function mayflydisable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled fly mode for ${player === member ? "themselves" : member.nameTag}.`);
}

function mayflyenable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled fly mode for ${player === member ? "themselves" : member.nameTag}.`);
}
export async function uiFLY(flyResult, onlineList, player) {
    const [value] = flyResult.formValues;
    let member: Player = undefined;
    for (let pl of world.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(onlineList[value].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }
    const membertag = member.getTags();

    if (!membertag.includes("noflying") && !membertag.includes("flying")) {
        try {
            await member.runCommandAsync(`ability @s mayfly true`);
            member.addTag("flying");
            mayflyenable(player, member);
        } catch (Error) {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Education Edition is disabled in this world.`);
        }
        return;
    }

    if (membertag.includes("flying")) {
        member.addTag("noflying");
    }

    if (member.hasTag("noflying")) {
        try {
            await member.runCommandAsync(`ability @s mayfly false`);
            member.removeTag("flying");
            mayflydisable(player, member);
            member.removeTag("noflying");
        } catch (error) {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Education Edition is disabled in this world.`);
        }
        return;
    }

    return paradoxui(player);
}

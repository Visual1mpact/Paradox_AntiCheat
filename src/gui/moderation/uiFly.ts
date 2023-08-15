import { Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { sendMsg, sendMsgToPlayer } from "../../util";
import { paradoxui } from "../paradoxui.js";
import { ModalFormResponse } from "@minecraft/server-ui";
function mayflydisable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled fly mode for ${player === member ? "themselves" : member.name}.`);
}

function mayflyenable(player: Player, member: Player) {
    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled fly mode for ${player === member ? "themselves" : member.name}.`);
}

/**
 * Handles the result of a modal form used for toggling flight mode.
 *
 * @name uiFLY
 * @param {ModalFormResponse} flyResult - The result of the flight mode toggle modal form.
 * @param {string[]} onlineList - The list of online player names.
 * @param {Player} player - The player who triggered the flight mode toggle modal form.
 */
export function uiFLY(flyResult: ModalFormResponse, onlineList: string[], player: Player) {
    handleUIFly(flyResult, onlineList, player).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });
}

async function handleUIFly(flyResult: ModalFormResponse, onlineList: string[], player: Player) {
    const [value] = flyResult.formValues;
    let member: Player = undefined;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(onlineList[value as number].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }
    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);
    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped.`);
    }

    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldnt find that player!`);
    }
    const membertag = member.getTags();

    if (!membertag.includes("noflying") && !membertag.includes("flying")) {
        member
            .runCommandAsync(`ability @s mayfly true`)
            .then(() => {
                member.addTag("flying");
                mayflyenable(player, member);
            })
            .catch(() => {
                return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Education Edition is disabled in this world.`);
            });

        return;
    }

    if (membertag.includes("flying")) {
        member.addTag("noflying");
    }

    if (member.hasTag("noflying")) {
        member
            .runCommandAsync(`ability @s mayfly false`)
            .then(() => {
                member.removeTag("flying");
                mayflydisable(player, member);
                member.removeTag("noflying");
            })
            .catch(() => {
                return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Education Edition is disabled in this world.`);
            });
        return;
    }

    return paradoxui(player);
}

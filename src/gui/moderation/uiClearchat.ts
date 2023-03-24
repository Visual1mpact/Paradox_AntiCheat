import { Player, sendMsg, paradoxui } from "../../index";

export function uiCLEARCHAT(player: Player) {
    for (let clear = 0; clear < 10; clear++) sendMsg("@a", "\n".repeat(60));

    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Chat has been cleared by ${player.nameTag}`);
    return paradoxui(player);
}

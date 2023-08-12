import { Player } from "@minecraft/server";
import { sendMsg } from "../../util";
import { paradoxui } from "../paradoxui";
export function uiCLEARCHAT(player: Player) {
    for (let clear = 0; clear < 10; clear++) sendMsg("@a", "\n".repeat(60));

    sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f Chat has been cleared by ${player.name}`);
    return paradoxui(player);
}

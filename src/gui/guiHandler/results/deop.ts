import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiDEOP } from "../../moderation/uiDeop";

export function deopHandler(player: Player) {
    // New window for deop
    const deopgui = new ModalFormData();
    let onlineList: string[] = [];
    deopgui.title("§4DEOP§4");
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    deopgui.dropdown(`\n§fSelect a player to remove access to Paradox:§f\n\nPlayer's Online\n`, onlineList);
    deopgui.show(player).then((opResult) => {
        uiDEOP(opResult, onlineList, player);
    });
}

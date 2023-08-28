import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiKICK } from "../../../moderation/uiKick";

export function kickHandler(player: Player) {
    const kickui = new ModalFormData();
    kickui.title("§4Paradox - Kick A Player§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    kickui.dropdown(`\n§fSelect a player to Kick:§f\n\nPlayer's Online\n`, onlineList);
    kickui.textField("Reason:", "Hacking!");

    kickui.show(player).then((kickResult) => {
        uiKICK(kickResult, onlineList, player);
    });
}

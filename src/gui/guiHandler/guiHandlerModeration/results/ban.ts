import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiBAN } from "../../../moderation/uiBan";

export function banHandler(player: Player) {
    //show ban ui here
    const banui = new ModalFormData();
    let onlineList: string[] = [];

    banui.title("§4Paradox - Ban A Player§4");
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    banui.dropdown(`\n§fSelect a player to Ban:§f\n\nPlayer's Online\n`, onlineList);
    banui.textField(`Reason:`, `Enter a reason.`);
    banui.show(player).then((banResult) => {
        //ban function goes here
        uiBAN(banResult, onlineList, player);
    });
}

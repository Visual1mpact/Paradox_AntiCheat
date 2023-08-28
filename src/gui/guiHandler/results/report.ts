import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { UIREPORTPLAYER } from "../../playerui/uiReport";

export function reportHandler(player: Player) {
    //Non Opped player Report UI
    const reportplayerui = new ModalFormData();
    reportplayerui.title("§4Paradox - Report A Player§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    reportplayerui.dropdown(`\n§fSelect a player from the list, your report will then be sent to staff members:§f\n\nPlayer's Online\n`, onlineList);
    reportplayerui.textField("Please provide a reason as to why you are reporting this player:", "");
    reportplayerui.show(player).then((reportResult) => {
        UIREPORTPLAYER(reportResult, onlineList, player);
    });
}

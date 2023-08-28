import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiEWIPE } from "../../../moderation/uiEwipe";

export function ecwipeHandler(player: Player) {
    const ewipeui = new ModalFormData();
    ewipeui.title("§4Paradox - Wipe A Player's Enderchest§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    ewipeui.dropdown(`\n§fSelect a player to wipe their Enderchest:§f\n\nPlayer's Online\n`, onlineList);
    ewipeui.show(player).then((ewipeResult) => {
        uiEWIPE(ewipeResult, onlineList, player);
    });
}

import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiUNBAN } from "../../../moderation/uiUnban";

export function unbanHandler(player: Player) {
    //show unban ui here
    const unbanui = new ModalFormData();
    unbanui.title("§4Paradox - Unban A Player§4");
    unbanui.textField(`Player:`, `Enter a username.`);
    unbanui.toggle("Remove player from the un-ban queue:", false);
    unbanui.show(player).then((unbanResult) => {
        uiUNBAN(unbanResult, player);
    });
}

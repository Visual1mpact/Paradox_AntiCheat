import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

export function uiChatChannelsJoinMenu(player: Player) {
    const menu = new ModalFormData();
    menu.title("§4Paradox - Join A Channel§4");
    menu.textField("Channel Name: ", "");
    menu.textField("Channel Password: ", "");
}

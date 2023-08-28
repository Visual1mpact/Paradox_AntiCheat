import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiUNMUTE } from "../../../../moderation/uiUnmute";

export function unmuteHandler(player: Player) {
    //UnMute ui
    const unmuteui = new ModalFormData();
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    unmuteui.title("§4Mute A Player In Chat§4");
    unmuteui.dropdown(`\n§fSelect a player to unmute:§f\n\nPlayer's Online\n`, onlineList);
    unmuteui.textField("Reason:", "Permissions to talk in chat.");
    unmuteui.show(player).then((muteResult) => {
        uiUNMUTE(muteResult, onlineList, player);
    });
}

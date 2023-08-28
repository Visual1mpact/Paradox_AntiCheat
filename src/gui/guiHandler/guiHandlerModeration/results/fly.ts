import { Player, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { uiFLY } from "../../../moderation/uiFly";

export function flyHandler(player: Player) {
    const flyui = new ModalFormData();
    flyui.title("§4Paradox - Grant A Player Fly Abilities§4");
    let onlineList: string[] = [];
    onlineList = Array.from(world.getPlayers(), (player) => player.name);
    flyui.dropdown(`\n§fSelect a player to allow the ability to fly:§f\n\nPlayer's Online\n`, onlineList);
    flyui.show(player).then((flyResult) => {
        uiFLY(flyResult, onlineList, player);
    });
}

import { Player, world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

async function paradoxui(player: Player) {
    await new ActionFormData()
        .title("§4Paradox§4")
        .body("§eA utility to fight against malicious hackers on Bedrock Edition§e")
        .button("§0op§2", "textures/items/ender_eye")
        .button("§0deop§2", "textures/items/ender_pearl")
        .show(player)
        .then((result) => {
            if (result.selection === 0) {
                // New window for op
                const opgui = new ModalFormData();
                let onlineList: string[] = [];
                opgui.title("§4OP§4");
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                opgui.dropdown(`\n  §rSelect a player to give access to Paradox.§r\n\nPlayer's Online\n`, onlineList);
                opgui.show(player).then((opResult) => {});
            }
            if (result.selection === 1) {
                // New window for deop
                const deopgui = new ModalFormData();
                let onlineList: string[] = [];
                deopgui.title("§4DEOP§4");
                onlineList = Array.from(world.getPlayers(), (player) => player.name);
                deopgui.dropdown(`\n  §rSelect a player to remove access to Paradox.§r\n\nPlayer's Online\n`, onlineList);
                deopgui.show(player).then((opResult) => {});
            }

            // We looping here so don't mind me while I dance a little
            if (result.canceled && result.cancelationReason === "userBusy") {
                /**
                 * Continue to call the function with the player object
                 * until the user is no longer busy. This should mean
                 * they do not have a GUI open and we can now show this form.
                 */
                paradoxui(player);
            }
        });
}

export { paradoxui };
